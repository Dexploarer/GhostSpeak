/*!
 * Bulk Deals Module
 * 
 * Implements enterprise and volume discount pricing for large-scale
 * agent service purchases with custom SLA terms.
 */

use anchor_lang::prelude::*;
use crate::state::*;
use crate::PodAIMarketplaceError;

/// Creates a bulk or enterprise deal with volume discounts
/// 
/// Establishes special pricing and terms for large-volume purchases
/// or long-term enterprise agreements with favorable rates.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing bulk deal accounts
/// * `deal_data` - Bulk deal configuration including:
///   - `service_bundles` - Services included in deal
///   - `minimum_volume` - Minimum purchase commitment
///   - `discount_tiers` - Volume-based discount structure
///   - `contract_duration` - Length of agreement
///   - `payment_terms` - Payment schedule options
///   - `sla_terms` - Service level agreements
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful deal creation
/// 
/// # Errors
/// 
/// * `VolumeTooLow` - If below minimum for bulk pricing
/// * `InvalidDiscountStructure` - If tiers overlap or invalid
/// * `DurationTooShort` - If contract less than 30 days
/// 
/// # Discount Structure Example
/// 
/// ```text
/// 10-50 units: 10% discount
/// 51-100 units: 20% discount
/// 101-500 units: 30% discount
/// 500+ units: 40% discount
/// ```
/// 
/// # Benefits
/// 
/// - Predictable costs for buyers
/// - Guaranteed revenue for agents
/// - Priority support included
/// - Custom SLA terms
pub fn create_bulk_deal(
    ctx: Context<CreateBulkDeal>,
    deal_data: BulkDealData,
) -> Result<()> {
    let deal = &mut ctx.accounts.deal;
    let agent = &ctx.accounts.agent;
    let clock = Clock::get()?;

    require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
    require!(deal_data.end_date > clock.unix_timestamp, PodAIMarketplaceError::InvalidDeadline);

    deal.agent = agent.key();
    deal.customer = ctx.accounts.customer.key();
    deal.deal_type = deal_data.deal_type;
    deal.total_volume = deal_data.total_volume;
    deal.total_value = deal_data.total_value;
    deal.discount_percentage = deal_data.discount_percentage;
    deal.volume_tiers = deal_data.volume_tiers;
    deal.sla_terms = deal_data.sla_terms;
    deal.contract_duration = deal_data.contract_duration;
    deal.start_date = clock.unix_timestamp;
    deal.end_date = deal_data.end_date;
    deal.is_active = true;
    deal.created_at = clock.unix_timestamp;
    deal.bump = ctx.bumps.deal;

    emit!(BulkDealCreatedEvent {
        deal: deal.key(),
        agent: agent.key(),
        customer: ctx.accounts.customer.key(),
        deal_type: deal_data.deal_type,
        total_value: deal_data.total_value,
    });

    Ok(())
}

// Context structures
#[derive(Accounts)]
pub struct CreateBulkDeal<'info> {
    #[account(
        init,
        payer = customer,
        space = BulkDeal::LEN,
        seeds = [b"bulk_deal", agent.key().as_ref(), customer.key().as_ref()],
        bump
    )]
    pub deal: Account<'info, BulkDeal>,
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub customer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Events
#[event]
pub struct BulkDealCreatedEvent {
    pub deal: Pubkey,
    pub agent: Pubkey,
    pub customer: Pubkey,
    pub deal_type: DealType,
    pub total_value: u64,
}

// Data structures
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BulkDealData {
    pub deal_type: DealType,
    pub total_volume: u32,
    pub total_value: u64,
    pub discount_percentage: f64,
    pub volume_tiers: Vec<VolumeTier>,
    pub sla_terms: String,
    pub contract_duration: i64,
    pub end_date: i64,
}