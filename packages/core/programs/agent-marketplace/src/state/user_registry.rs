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
        1; // bump

    pub fn increment_agents(&mut self) -> Result<()> {
        self.agent_count = self.agent_count
            .checked_add(1)
            .ok_or(crate::PodAIMarketplaceError::ArithmeticOverflow)?;
        
        if self.agent_count > MAX_AGENTS_PER_USER {
            return Err(crate::PodAIMarketplaceError::TooManyCapabilities.into());
        }
        
        Ok(())
    }

    pub fn increment_listings(&mut self) -> Result<()> {
        self.listing_count = self.listing_count
            .checked_add(1)
            .ok_or(crate::PodAIMarketplaceError::ArithmeticOverflow)?;
        
        if self.listing_count > MAX_LISTINGS_PER_AGENT {
            return Err(crate::PodAIMarketplaceError::InputTooLong.into());
        }
        
        Ok(())
    }

    pub fn increment_work_orders(&mut self) -> Result<()> {
        self.work_order_count = self.work_order_count
            .checked_add(1)
            .ok_or(crate::PodAIMarketplaceError::ArithmeticOverflow)?;
        
        if self.work_order_count > MAX_WORK_ORDERS_PER_USER {
            return Err(crate::PodAIMarketplaceError::TooManyRequirements.into());
        }
        
        Ok(())
    }

    pub fn increment_channels(&mut self) -> Result<()> {
        self.channel_count = self.channel_count
            .checked_add(1)
            .ok_or(crate::PodAIMarketplaceError::ArithmeticOverflow)?;
        
        if self.channel_count > MAX_CHANNELS_PER_USER {
            return Err(crate::PodAIMarketplaceError::InputTooLong.into());
        }
        
        Ok(())
    }

    pub fn add_volume(&mut self, amount: u64) -> Result<()> {
        self.total_volume_traded = self.total_volume_traded
            .checked_add(amount)
            .ok_or(crate::PodAIMarketplaceError::ArithmeticOverflow)?;
        
        Ok(())
    }

    pub fn check_rate_limit(&self, current_time: i64) -> Result<()> {
        if self.is_rate_limited && current_time < self.rate_limit_expiry {
            return Err(crate::PodAIMarketplaceError::RateLimitExceeded.into());
        }
        Ok(())
    }

    pub fn apply_rate_limit(&mut self, current_time: i64, duration: i64) {
        self.is_rate_limited = true;
        self.rate_limit_expiry = current_time + duration;
    }
}