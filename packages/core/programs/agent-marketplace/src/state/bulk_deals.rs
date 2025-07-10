/*!
 * Bulk Deals State Module
 * 
 * Contains bulk deal-related state structures.
 */

use anchor_lang::prelude::*;
use super::{MAX_GENERAL_STRING_LENGTH, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, PodAIMarketplaceError};

// PDA Seeds
pub const BULK_DEAL_SEED: &[u8] = b"bulk_deal";

// Constants
pub const MAX_VOLUME_TIERS: usize = 5;
pub const MAX_DISCOUNT_PERCENTAGE: u32 = 10000; // 100% in basis points

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DealType {
    VolumeDiscount,
    BundleOffer,
    GroupPurchase,
    Wholesale,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct VolumeTier {
    pub min_quantity: u32,
    pub max_quantity: u32,
    pub discount_percentage: u32, // Basis points (0-10000 for 0-100%)
}

#[account]
pub struct BulkDeal {
    pub agent: Pubkey,
    pub customer: Pubkey,
    pub deal_type: DealType,
    pub total_volume: u32,
    pub total_value: u64,
    pub discount_percentage: f64,
    pub volume_tiers: Vec<VolumeTier>,
    pub sla_terms: String,
    pub contract_duration: i64,
    pub start_date: i64,
    pub end_date: i64,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl BulkDeal {
    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // customer
        1 + // deal_type
        4 + // total_volume
        8 + // total_value
        8 + // discount_percentage (f64)
        4 + (MAX_VOLUME_TIERS * (4 + 4 + 4)) + // volume_tiers
        4 + MAX_GENERAL_STRING_LENGTH + // sla_terms
        8 + // contract_duration
        8 + // start_date
        8 + // end_date
        1 + // is_active
        8 + // created_at
        1; // bump

    pub fn initialize(
        &mut self,
        agent: Pubkey,
        customer: Pubkey,
        deal_type: DealType,
        total_volume: u32,
        total_value: u64,
        discount_percentage: f64,
        volume_tiers: Vec<VolumeTier>,
        sla_terms: String,
        contract_duration: i64,
        end_date: i64,
        bump: u8,
    ) -> Result<()> {
        require!(sla_terms.len() <= MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError::StringTooLong);
        require!(volume_tiers.len() <= MAX_VOLUME_TIERS, PodAIMarketplaceError::TooManyVolumeTiers);
        require!(total_volume > 0, PodAIMarketplaceError::InvalidVolume);
        require!(total_value > 0, PodAIMarketplaceError::InvalidValue);
        require!(discount_percentage >= 0.0 && discount_percentage <= 100.0, PodAIMarketplaceError::InvalidDiscountPercentage);
        require!(contract_duration > 0, PodAIMarketplaceError::InvalidDuration);
        
        let clock = Clock::get()?;
        require!(end_date > clock.unix_timestamp, PodAIMarketplaceError::InvalidExpiration);
        
        // Validate volume tiers
        for (i, tier) in volume_tiers.iter().enumerate() {
            require!(tier.max_quantity > tier.min_quantity, PodAIMarketplaceError::InvalidVolumeTier);
            require!(tier.discount_percentage <= MAX_DISCOUNT_PERCENTAGE, PodAIMarketplaceError::InvalidDiscountPercentage);
            
            // Check that tiers don't overlap
            if i > 0 {
                require!(tier.min_quantity > volume_tiers[i-1].max_quantity, PodAIMarketplaceError::OverlappingVolumeTiers);
            }
        }
        
        self.agent = agent;
        self.customer = customer;
        self.deal_type = deal_type;
        self.total_volume = total_volume;
        self.total_value = total_value;
        self.discount_percentage = discount_percentage;
        self.volume_tiers = volume_tiers;
        self.sla_terms = sla_terms;
        self.contract_duration = contract_duration;
        self.start_date = clock.unix_timestamp;
        self.end_date = end_date;
        self.is_active = true;
        self.created_at = clock.unix_timestamp;
        self.bump = bump;
        
        Ok(())
    }


    pub fn calculate_price(&self, quantity: u32) -> u64 {
        // Calculate base price from total value and volume
        let base_price_per_unit = self.total_value.saturating_div(self.total_volume as u64);
        let mut price = base_price_per_unit.saturating_mul(quantity as u64);
        
        // Apply volume discount if applicable
        for tier in &self.volume_tiers {
            if quantity >= tier.min_quantity && quantity <= tier.max_quantity {
                let discount_amount = price
                    .saturating_mul(tier.discount_percentage as u64)
                    .saturating_div(10000); // Convert from basis points
                price = price.saturating_sub(discount_amount);
                break;
            }
        }
        
        // Apply deal discount percentage
        let deal_discount = (price as f64 * self.discount_percentage / 100.0) as u64;
        price = price.saturating_sub(deal_discount);
        
        price
    }

    pub fn deactivate(&mut self) -> Result<()> {
        self.is_active = false;
        Ok(())
    }

    pub fn is_expired(&self) -> bool {
        let clock = Clock::get().unwrap();
        clock.unix_timestamp > self.end_date
    }
    
    pub fn is_within_contract(&self) -> bool {
        let clock = Clock::get().unwrap();
        clock.unix_timestamp >= self.start_date && clock.unix_timestamp <= self.end_date
    }
}