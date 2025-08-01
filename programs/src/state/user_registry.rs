/*!
 * User Registry State
 *
 * Tracks per-user resource limits and usage statistics for security
 */

use anchor_lang::prelude::*;

// Resource limits
pub const MAX_AGENTS_PER_USER: u16 = 100;
pub const MAX_LISTINGS_PER_AGENT: u16 = 50;
pub const MAX_WORK_ORDERS_PER_USER: u16 = 100;
pub const MAX_CHANNELS_PER_USER: u16 = 50;

#[account]
pub struct UserRegistry {
    pub user: Pubkey,
    pub agent_count: u16,
    pub listing_count: u16,
    pub work_order_count: u16,
    pub channel_count: u16,
    pub total_volume_traded: u64,
    pub last_activity: i64,
    pub created_at: i64,
    pub is_rate_limited: bool,
    pub rate_limit_expiry: i64,
    pub last_extension_registration: i64,
    pub last_dispute_filing: i64,
    pub last_evidence_submission: i64,
    pub last_batch_execution: i64,
    pub last_dashboard_update: i64,
    pub last_bulk_deal_creation: i64,
    pub last_dashboard_creation: i64,
    pub bump: u8,
}

impl UserRegistry {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        2 + // agent_count
        2 + // listing_count
        2 + // work_order_count
        2 + // channel_count
        8 + // total_volume_traded
        8 + // last_activity
        8 + // created_at
        1 + // is_rate_limited
        8 + // rate_limit_expiry
        8 + // last_extension_registration
        8 + // last_dispute_filing
        8 + // last_evidence_submission
        8 + // last_batch_execution
        8 + // last_dashboard_update
        8 + // last_bulk_deal_creation
        8 + // last_dashboard_creation
        1; // bump

    pub fn increment_agents(&mut self) -> Result<()> {
        self.agent_count = self
            .agent_count
            .checked_add(1)
            .ok_or(crate::GhostSpeakError::ArithmeticOverflow)?;

        if self.agent_count > MAX_AGENTS_PER_USER {
            return Err(crate::GhostSpeakError::TooManyCapabilities.into());
        }

        Ok(())
    }

    pub fn increment_listings(&mut self) -> Result<()> {
        self.listing_count = self
            .listing_count
            .checked_add(1)
            .ok_or(crate::GhostSpeakError::ArithmeticOverflow)?;

        if self.listing_count > MAX_LISTINGS_PER_AGENT {
            return Err(crate::GhostSpeakError::InputTooLong.into());
        }

        Ok(())
    }

    pub fn increment_work_orders(&mut self) -> Result<()> {
        self.work_order_count = self
            .work_order_count
            .checked_add(1)
            .ok_or(crate::GhostSpeakError::ArithmeticOverflow)?;

        if self.work_order_count > MAX_WORK_ORDERS_PER_USER {
            return Err(crate::GhostSpeakError::TooManyRequirements.into());
        }

        Ok(())
    }

    pub fn increment_channels(&mut self) -> Result<()> {
        self.channel_count = self
            .channel_count
            .checked_add(1)
            .ok_or(crate::GhostSpeakError::ArithmeticOverflow)?;

        if self.channel_count > MAX_CHANNELS_PER_USER {
            return Err(crate::GhostSpeakError::InputTooLong.into());
        }

        Ok(())
    }

    pub fn add_volume(&mut self, amount: u64) -> Result<()> {
        self.total_volume_traded = self
            .total_volume_traded
            .checked_add(amount)
            .ok_or(crate::GhostSpeakError::ArithmeticOverflow)?;

        Ok(())
    }

    pub fn check_rate_limit(&self, current_time: i64) -> Result<()> {
        if self.is_rate_limited && current_time < self.rate_limit_expiry {
            return Err(crate::GhostSpeakError::RateLimitExceeded.into());
        }
        Ok(())
    }

    /// Atomic operation that checks rate limit BEFORE incrementing agent count
    /// This prevents race conditions where multiple transactions could bypass rate limits
    /// by all incrementing before any check occurs.
    pub fn increment_agents_with_rate_limit_check(&mut self, current_time: i64) -> Result<()> {
        // SECURITY FIX: Check rate limit FIRST before making any state changes
        if self.is_rate_limited && current_time < self.rate_limit_expiry {
            return Err(crate::GhostSpeakError::RateLimitExceeded.into());
        }

        // Only proceed with increment if rate limit check passes
        self.agent_count = self
            .agent_count
            .checked_add(1)
            .ok_or(crate::GhostSpeakError::ArithmeticOverflow)?;

        // Check max agents limit after increment to ensure consistency with original behavior
        if self.agent_count > MAX_AGENTS_PER_USER {
            // Rollback the increment if limit exceeded
            self.agent_count = self.agent_count.saturating_sub(1);
            return Err(crate::GhostSpeakError::TooManyCapabilities.into());
        }

        // Update last activity timestamp to complete the atomic operation
        self.last_activity = current_time;

        Ok(())
    }

    pub fn apply_rate_limit(&mut self, current_time: i64, duration: i64) {
        self.is_rate_limited = true;
        self.rate_limit_expiry = current_time + duration;
    }
}
