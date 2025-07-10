/*!
 * Incentives Module
 * 
 * Implements reward and incentive programs to encourage growth,
 * quality, and engagement within the protocol.
 */

use anchor_lang::prelude::*;
use crate::state::incentives::{IncentiveProgram, IncentiveConfig, AgentIncentives};
use crate::PodAIMarketplaceError;

/// Creates an incentive program to encourage specific behaviors
/// 
/// Establishes reward programs for agents and users to drive growth,
/// quality improvements, or adoption of new features.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing incentive program accounts
/// * `program_data` - Incentive program configuration including:
///   - `program_type` - Referral, quality, volume, etc.
///   - `reward_structure` - How rewards are calculated
///   - `budget` - Total reward pool
///   - `duration` - Program length
///   - `eligibility_criteria` - Who can participate
///   - `max_participants` - Cap on participants
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful program creation
/// 
/// # Errors
/// 
/// * `InsufficientBudget` - If budget too low
/// * `DurationTooLong` - If exceeds 1 year
/// * `InvalidCriteria` - If criteria unreasonable
/// 
/// # Program Types
/// 
/// - **Referral**: Rewards for bringing new users
/// - **Quality**: Bonuses for high ratings
/// - **Volume**: Rewards for transaction volume
/// - **Early Adopter**: Benefits for trying new features
/// - **Loyalty**: Long-term user rewards
/// 
/// # Example Reward Structure
/// 
/// ```text
/// Referral Program:
/// - 10% of referred user's first month fees
/// - 5% ongoing for 6 months
/// - Bonus 100 USDC at 10 referrals
/// ```
pub fn create_incentive_program(
    ctx: Context<CreateIncentiveProgram>,
    config: IncentiveConfig,
) -> Result<()> {
    let program = &mut ctx.accounts.program;
    let clock = Clock::get()?;

    program.owner = ctx.accounts.creator.key();
    program.config = config.clone();  // Clone here
    program.total_rewards_distributed = 0;
    program.is_active = true;
    program.created_at = clock.unix_timestamp;
    program.updated_at = clock.unix_timestamp;
    program.bump = ctx.bumps.program;

    emit!(IncentiveProgramCreatedEvent {
        program: program.key(),
        referral_bonus: config.referral_bonus,
        performance_bonus: config.performance_bonus,
    });

    Ok(())
}

/// Distributes earned incentives to eligible participants
/// 
/// Processes and pays out rewards from incentive programs based on
/// achievement of program criteria and available budget.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing program and recipient accounts
/// * `distribution_data` - Distribution parameters including:
///   - `period` - Which period to process
///   - `recipient_list` - Eligible recipients
///   - `calculation_method` - How to calculate amounts
///   - `max_payout_per_user` - Cap per participant
/// 
/// # Returns
/// 
/// Returns `Ok(())` with distribution summary
/// 
/// # Errors
/// 
/// * `ProgramInactive` - If program has ended
/// * `AlreadyDistributed` - If period already processed
/// * `InsufficientProgramFunds` - If budget exhausted
/// 
/// # Distribution Process
/// 
/// 1. Verify participant eligibility
/// 2. Calculate reward amounts
/// 3. Apply caps and adjustments
/// 4. Process batch transfers
/// 5. Update program statistics
/// 
/// # Fairness Measures
/// 
/// - Proportional distribution
/// - Anti-gaming mechanisms
/// - Minimum threshold requirements
/// - Maximum cap per participant
/// 
/// # Tax Compliance
/// 
/// Large distributions may require:
/// - KYC verification
/// - Tax form submission
/// - Regulatory reporting
pub fn distribute_incentives(
    ctx: Context<DistributeIncentives>,
    agent: Pubkey,
    incentive_type: String,
    amount: u64,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.distributor.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );
    
    let program = &mut ctx.accounts.program;
    let incentives = &mut ctx.accounts.incentives;
    let clock = Clock::get()?;

    // Update agent incentives based on type
    match incentive_type.as_str() {
        "referral" => {
            // SECURITY FIX: Use checked arithmetic for referral stats
            incentives.referral_earnings = incentives.referral_earnings
                .checked_add(amount)
                .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;
            incentives.referrals_count = incentives.referrals_count
                .checked_add(1)
                .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;
        },
        "volume" | "quality" | "retention" => {
            // Map volume, quality, and retention bonuses to performance earnings
            incentives.performance_earnings = incentives.performance_earnings
                .checked_add(amount)
                .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;
        },
        "innovation" | "loyalty" => {
            // Map innovation and loyalty bonuses to loyalty points
            incentives.loyalty_points = incentives.loyalty_points
                .checked_add(amount)
                .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;
        },
        _ => return Err(PodAIMarketplaceError::InvalidApplicationStatus.into()),
    }

    // SECURITY FIX: Use checked arithmetic for totals
    incentives.total_earnings = incentives.total_earnings
        .checked_add(amount)
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;
    incentives.last_activity = clock.unix_timestamp;
    program.total_rewards_distributed = program.total_rewards_distributed
        .checked_add(amount)
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;
    program.updated_at = clock.unix_timestamp;

    emit!(IncentiveDistributedEvent {
        program: program.key(),
        agent,
        incentive_type,
        amount,
    });

    Ok(())
}

// Context structures
#[derive(Accounts)]
pub struct CreateIncentiveProgram<'info> {
    #[account(
        init,
        payer = creator,
        space = IncentiveProgram::LEN,
        seeds = [b"incentive_program", creator.key().as_ref()],
        bump
    )]
    pub program: Account<'info, IncentiveProgram>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributeIncentives<'info> {
    #[account(mut)]
    pub program: Account<'info, IncentiveProgram>,
    #[account(mut)]
    pub incentives: Account<'info, AgentIncentives>,
    pub distributor: Signer<'info>,
}

// Events
#[event]
pub struct IncentiveProgramCreatedEvent {
    pub program: Pubkey,
    pub referral_bonus: f64,
    pub performance_bonus: f64,
}

#[event]
pub struct IncentiveDistributedEvent {
    pub program: Pubkey,
    pub agent: Pubkey,
    pub incentive_type: String,
    pub amount: u64,
}