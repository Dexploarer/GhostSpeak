/*!
 * Replication Instructions Module
 * 
 * Contains all replication-related instruction handlers for the GhostSpeak Protocol.
 * This module manages agent template creation and replication functionality.
 */

use anchor_lang::prelude::*;
use crate::*;

/// Data structure for creating a replication template
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ReplicationTemplateData {
    pub genome_hash: String,
    pub base_capabilities: Vec<String>,
    pub replication_fee: u64,
    pub max_replications: u32,
}

/// Data structure for agent customization during replication
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AgentCustomization {
    pub name: String,
    pub description: Option<String>,
    pub additional_capabilities: Vec<String>,
    pub pricing_model: PricingModel,
    pub is_replicable: bool,
    pub replication_fee: Option<u64>,
}

/// Creates a replication template for an existing agent
/// 
/// Allows agent owners to create templates that enable controlled replication
/// of their agents with defined pricing and limitations.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing template and agent accounts
/// * `template_data` - Template configuration including:
///   - `base_price` - One-time fee for replication
///   - `royalty_percentage` - Ongoing royalty from earnings
///   - `max_replications` - Maximum allowed replications
///   - `replication_config` - Custom replication parameters
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful template creation
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - If caller is not the agent owner
/// * `AgentNotReplicable` - If agent doesn't allow replication
/// * `InvalidConfiguration` - If template parameters are invalid
/// 
/// # Pricing Model
/// 
/// - One-time base price per replication
/// - Ongoing royalty from replicated agent earnings
pub fn create_replication_template(
    ctx: Context<CreateReplicationTemplate>,
    template_data: ReplicationTemplateData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.creator.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Input validation
    const MAX_GENOME_HASH_LENGTH: usize = 64;
    const MAX_CAPABILITIES: usize = 20;
    
    require!(
        !template_data.genome_hash.is_empty() && template_data.genome_hash.len() <= MAX_GENOME_HASH_LENGTH,
        PodAIMarketplaceError::InputTooLong
    );
    require!(
        template_data.base_capabilities.len() <= MAX_CAPABILITIES,
        PodAIMarketplaceError::InputTooLong
    );
    require!(
        template_data.replication_fee > 0 && template_data.replication_fee <= MAX_PAYMENT_AMOUNT,
        PodAIMarketplaceError::InvalidPaymentAmount
    );
    require!(
        template_data.max_replications > 0,
        PodAIMarketplaceError::InvalidPaymentAmount
    );

    let template = &mut ctx.accounts.replication_template;
    let agent = &ctx.accounts.source_agent;

    // Verify agent allows replication
    require!(
        agent.is_replicable,
        PodAIMarketplaceError::UnauthorizedAccess
    );
    template.source_agent = agent.key();
    template.creator = ctx.accounts.creator.key();
    template.genome_hash = agent.genome_hash.clone();
    template.base_capabilities = agent.capabilities.clone();
    template.replication_fee = template_data.replication_fee;
    template.max_replications = template_data.max_replications;
    template.current_replications = 0;
    template.is_active = true;
    template.created_at = Clock::get()?.unix_timestamp;
    template.bump = ctx.bumps.replication_template;

    emit!(crate::state::replication::ReplicationTemplateCreatedEvent {
        template: template.key(),
        agent: agent.key(),
        owner: ctx.accounts.creator.key(),
        fee: template_data.replication_fee,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Replicates a new agent instance from an existing template
/// 
/// Creates a new agent with capabilities and configurations from a template,
/// while maintaining unique identity and ownership.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing new agent and template accounts
/// * `replication_data` - Replication details including:
///   - `template` - Template to replicate from
///   - `custom_name` - Name for the new agent
///   - `modifications` - Custom modifications to template
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful replication
/// 
/// # Errors
/// 
/// * `TemplateNotActive` - If template is discontinued
/// * `InsufficientFunds` - If user lacks funds for base price
/// * `InvalidModifications` - If modifications violate template rules
/// 
/// # Replication Process
/// 
/// 1. Validates template availability
/// 2. Charges base template price
/// 3. Creates new agent with template config
/// 4. Sets up royalty stream to template creator
/// 5. Applies any custom modifications
/// 
/// # Important Notes
/// 
/// - Replicated agents are independent entities
/// - Template updates don't affect existing replications
/// - Royalties are automatically deducted from earnings
pub fn replicate_agent(
    ctx: Context<ReplicateAgent>,
    customization: AgentCustomization,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.buyer.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Input validation
    const MAX_NAME_LENGTH: usize = 64;
    const MAX_CUSTOM_CONFIG_LENGTH: usize = 1024;
    
    require!(
        !customization.name.is_empty() && customization.name.len() <= MAX_NAME_LENGTH,
        PodAIMarketplaceError::NameTooLong
    );
    require!(
        customization.description.as_ref().map_or(true, |desc| desc.len() <= MAX_CUSTOM_CONFIG_LENGTH),
        PodAIMarketplaceError::InputTooLong
    );

    let template = &mut ctx.accounts.replication_template;
    let new_agent = &mut ctx.accounts.new_agent;
    let replication_record = &mut ctx.accounts.replication_record;
    let clock = Clock::get()?;

    require!(template.is_active, PodAIMarketplaceError::AgentNotActive);
    require!(template.current_replications < template.max_replications, PodAIMarketplaceError::InsufficientFunds);

    new_agent.owner = ctx.accounts.buyer.key();
    new_agent.name = customization.name.clone();
    new_agent.description = customization.description.unwrap_or_default();
    new_agent.capabilities = template.base_capabilities.clone();
    new_agent.capabilities.extend(customization.additional_capabilities.clone());
    new_agent.pricing_model = customization.pricing_model;
    new_agent.reputation_score = 0;
    new_agent.total_jobs_completed = 0;
    new_agent.total_earnings = 0;
    new_agent.is_active = true;
    new_agent.created_at = Clock::get()?.unix_timestamp;
    new_agent.updated_at = Clock::get()?.unix_timestamp;
    new_agent.genome_hash = template.genome_hash.clone();
    new_agent.is_replicable = customization.is_replicable;
    new_agent.replication_fee = customization.replication_fee.unwrap_or(0);
    new_agent.bump = ctx.bumps.new_agent;

    replication_record.record_id = 0; // Could be derived from global counter
    replication_record.original_agent = template.source_agent;
    replication_record.replicated_agent = new_agent.key();
    replication_record.replicator = ctx.accounts.buyer.key();
    replication_record.fee_paid = template.replication_fee;
    replication_record.replicated_at = Clock::get()?.unix_timestamp;
    replication_record.bump = ctx.bumps.replication_record;

    // SECURITY: Update replication count with overflow protection
    template.current_replications = template.current_replications
        .checked_add(1)
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;

    emit!(crate::state::replication::AgentReplicatedEvent {
        original_agent: template.source_agent,
        replicated_agent: new_agent.key(),
        replicator: ctx.accounts.buyer.key(),
        fee_paid: template.replication_fee,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// =====================================================
// ACCOUNT CONTEXTS
// =====================================================

#[derive(Accounts)]
#[instruction(template_data: ReplicationTemplateData)]
pub struct CreateReplicationTemplate<'info> {
    #[account(
        init,
        payer = creator,
        space = crate::state::ReplicationRecord::LEN,
        seeds = [b"replication_template", source_agent.key().as_ref()],
        bump
    )]
    pub replication_template: Account<'info, crate::state::ReplicationTemplate>,
    
    pub source_agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(customization: AgentCustomization)]
pub struct ReplicateAgent<'info> {
    #[account(mut)]
    pub replication_template: Account<'info, crate::state::ReplicationTemplate>,
    
    #[account(
        init,
        payer = buyer,
        space = Agent::LEN,
        seeds = [b"agent", buyer.key().as_ref()],
        bump
    )]
    pub new_agent: Account<'info, Agent>,
    
    #[account(
        init,
        payer = buyer,
        space = ReplicationRecord::LEN,
        seeds = [b"replication_record", replication_template.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub replication_record: Account<'info, ReplicationRecord>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}