/*!
 * Rate Limiting Module
 *
 * Implements rate limiting to prevent spam and DoS attacks on the GhostSpeak protocol.
 * Based on a sliding window algorithm with configurable limits per user and operation.
 */

use anchor_lang::prelude::*;

/// Rate limiter configuration for different operation types
#[account]
pub struct RateLimiter {
    /// Authority that can update rate limits
    pub authority: Pubkey,

    /// Global rate limit configuration
    pub global_config: RateLimitConfig,

    /// Per-operation rate limits
    pub operation_limits: Vec<OperationLimit>,

    /// Bump seed
    pub bump: u8,
}

/// Configuration for rate limiting
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RateLimitConfig {
    /// Default requests per window
    pub default_limit: u16,

    /// Window duration in seconds
    pub window_duration: i64,

    /// Whether rate limiting is enabled
    pub enabled: bool,

    /// Penalty duration for violations
    pub penalty_duration: i64,

    /// Max burst size allowed
    pub burst_size: u16,
}

/// Per-operation rate limit configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct OperationLimit {
    /// Operation identifier
    pub operation: String,

    /// Requests allowed per window
    pub limit: u16,

    /// Custom window duration (0 = use default)
    pub window_duration: i64,

    /// Whether this operation has burst allowance
    pub allow_burst: bool,
}

/// User rate limit tracking
#[account]
pub struct UserRateLimit {
    /// User being tracked
    pub user: Pubkey,

    /// Operation being tracked
    pub operation: String,

    /// Request timestamps in current window
    pub request_timestamps: Vec<i64>,

    /// Last window reset time
    pub window_start: i64,

    /// Total requests in current window
    pub request_count: u16,

    /// Penalty expiration (0 = no penalty)
    pub penalty_until: i64,

    /// Consecutive violations
    pub violation_count: u8,

    /// Bump seed
    pub bump: u8,
}

impl RateLimiter {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        128 + // global_config
        4 + (50 * 64) + // operation_limits (max 50)
        1; // bump

    /// Initialize rate limiter
    pub fn initialize(
        &mut self,
        authority: Pubkey,
        config: RateLimitConfig,
        bump: u8,
    ) -> Result<()> {
        self.authority = authority;
        self.global_config = config;
        self.operation_limits = Vec::new();
        self.bump = bump;
        Ok(())
    }

    /// Get limit for an operation
    pub fn get_operation_limit(&self, operation: &str) -> (u16, i64) {
        if let Some(op_limit) = self
            .operation_limits
            .iter()
            .find(|op| op.operation == operation)
        {
            let window = if op_limit.window_duration > 0 {
                op_limit.window_duration
            } else {
                self.global_config.window_duration
            };
            (op_limit.limit, window)
        } else {
            (
                self.global_config.default_limit,
                self.global_config.window_duration,
            )
        }
    }
}

impl UserRateLimit {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        4 + 64 + // operation string
        4 + (100 * 8) + // request_timestamps (max 100)
        8 + // window_start
        2 + // request_count
        8 + // penalty_until
        1 + // violation_count
        1; // bump

    /// Initialize user rate limit tracking
    pub fn initialize(&mut self, user: Pubkey, operation: String, bump: u8) -> Result<()> {
        let clock = Clock::get()?;

        self.user = user;
        self.operation = operation;
        self.request_timestamps = Vec::new();
        self.window_start = clock.unix_timestamp;
        self.request_count = 0;
        self.penalty_until = 0;
        self.violation_count = 0;
        self.bump = bump;

        Ok(())
    }

    /// Check if user is rate limited
    pub fn check_rate_limit(&mut self, rate_limiter: &RateLimiter) -> Result<bool> {
        if !rate_limiter.global_config.enabled {
            return Ok(true); // Rate limiting disabled
        }

        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Check if user is in penalty period
        if self.penalty_until > 0 && current_time < self.penalty_until {
            return Ok(false); // Still penalized
        }

        // Get limits for this operation
        let (limit, window_duration) = rate_limiter.get_operation_limit(&self.operation);

        // Clean up old timestamps outside current window
        let window_start = current_time - window_duration;
        self.request_timestamps.retain(|&ts| ts > window_start);

        // Update window if needed
        if current_time - self.window_start > window_duration {
            self.window_start = current_time;
            self.request_count = self.request_timestamps.len() as u16;
        }

        // Check if limit exceeded
        if self.request_count >= limit {
            // Apply penalty
            self.violation_count = self.violation_count.saturating_add(1);
            self.penalty_until = current_time
                + rate_limiter.global_config.penalty_duration * self.violation_count as i64;
            return Ok(false);
        }

        // Check burst limit if applicable
        let op_limit = rate_limiter
            .operation_limits
            .iter()
            .find(|op| op.operation == self.operation);

        if let Some(op) = op_limit {
            if op.allow_burst {
                // Check burst window (last 10 seconds)
                let burst_window = current_time - 10;
                let recent_requests = self
                    .request_timestamps
                    .iter()
                    .filter(|&&ts| ts > burst_window)
                    .count() as u16;

                if recent_requests >= rate_limiter.global_config.burst_size {
                    return Ok(false); // Burst limit exceeded
                }
            }
        }

        Ok(true)
    }

    /// Record a new request
    pub fn record_request(&mut self) -> Result<()> {
        let clock = Clock::get()?;

        self.request_timestamps.push(clock.unix_timestamp);
        self.request_count = self.request_count.saturating_add(1);

        // Keep only last 100 timestamps to save space
        if self.request_timestamps.len() > 100 {
            self.request_timestamps.remove(0);
        }

        // Reset violation count on successful requests
        if self.penalty_until == 0 {
            self.violation_count = 0;
        }

        Ok(())
    }
}

/// Input validation helper functions
pub mod validation {
    use super::*;

    /// Validate string length
    pub fn validate_string_length(s: &str, min: usize, max: usize) -> Result<()> {
        require!(
            s.len() >= min && s.len() <= max,
            crate::GhostSpeakError::InvalidInputLength
        );
        Ok(())
    }

    /// Validate amount range
    pub fn validate_amount(amount: u64, min: u64, max: u64) -> Result<()> {
        require!(
            amount >= min && amount <= max,
            crate::GhostSpeakError::InvalidAmount
        );
        Ok(())
    }

    /// Validate percentage (0-100)
    pub fn validate_percentage(value: u8) -> Result<()> {
        require!(value <= 100, crate::GhostSpeakError::InvalidPercentage);
        Ok(())
    }

    /// Validate public key is not default
    pub fn validate_pubkey(pubkey: &Pubkey) -> Result<()> {
        require!(
            *pubkey != Pubkey::default(),
            crate::GhostSpeakError::InvalidState
        );
        Ok(())
    }

    /// Validate timestamp is reasonable
    pub fn validate_timestamp(timestamp: i64) -> Result<()> {
        let clock = Clock::get()?;
        let current = clock.unix_timestamp;

        // Allow timestamps within 1 hour past and 1 year future
        require!(
            timestamp >= current - 3600 && timestamp <= current + 31536000,
            crate::GhostSpeakError::InvalidState
        );
        Ok(())
    }

    /// Validate array length
    pub fn validate_array_length<T>(arr: &[T], min: usize, max: usize) -> Result<()> {
        require!(
            arr.len() >= min && arr.len() <= max,
            crate::GhostSpeakError::InvalidInputLength
        );
        Ok(())
    }
}

/// Account validation structs for rate limiting

#[derive(Accounts)]
pub struct InitializeRateLimiter<'info> {
    #[account(
        init,
        payer = authority,
        space = RateLimiter::LEN,
        seeds = [b"rate_limiter"],
        bump
    )]
    pub rate_limiter: Account<'info, RateLimiter>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(operation: String)]
pub struct CheckRateLimit<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = UserRateLimit::LEN,
        seeds = [b"user_rate_limit", user.key().as_ref(), operation.as_bytes()],
        bump
    )]
    pub user_rate_limit: Account<'info, UserRateLimit>,

    #[account(
        seeds = [b"rate_limiter"],
        bump = rate_limiter.bump
    )]
    pub rate_limiter: Account<'info, RateLimiter>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Helper macro for rate limit checking
#[macro_export]
macro_rules! check_rate_limit {
    ($ctx:expr, $operation:expr) => {{
        let rate_limit_account = &mut $ctx.accounts.user_rate_limit;
        let rate_limiter = &$ctx.accounts.rate_limiter;

        // Initialize if needed
        if rate_limit_account.user == Pubkey::default() {
            rate_limit_account.initialize(
                $ctx.accounts.user.key(),
                $operation.to_string(),
                $ctx.bumps.user_rate_limit,
            )?;
        }

        // Check rate limit
        if !rate_limit_account.check_rate_limit(rate_limiter)? {
            return Err(error!(crate::GhostSpeakError::RateLimitExceeded));
        }

        // Record the request
        rate_limit_account.record_request()?;
    }};
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limit_tracking() {
        // Test rate limit calculations and struct sizes
        // Verify that our account structures have reasonable sizes
        let rate_limiter_size = RateLimiter::LEN;
        let user_rate_limit_size = UserRateLimit::LEN;

        // These are compile-time constants, so we test their expected values
        assert_eq!(rate_limiter_size, 8 + 8 + 8 + 32 + 8); // discriminator + fields
        assert_eq!(user_rate_limit_size, 8 + 32 + 8 + 8 + 8 + 8); // discriminator + fields
    }
}
