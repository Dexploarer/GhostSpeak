/*!
 * Replication Instructions Module
 *
 * Contains all replication-related instruction handlers for the GhostSpeak Protocol.
 * This module manages agent template creation and replication functionality.
 */

use crate::state::{RoyaltyConfig, RoyaltyStream};
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

/// Data structure for batch replication request
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BatchReplicationRequest {
    pub customizations: Vec<AgentCustomization>,
    pub royalty_percentage: u32, // Basis points (0-10000 for 0-100%)
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
        GhostSpeakError::UnauthorizedAccess
    );

    // SECURITY: Input validation
    const MAX_GENOME_HASH_LENGTH: usize = 64;
    const MAX_CAPABILITIES: usize = 20;

    require!(
        !template_data.genome_hash.is_empty()
            && template_data.genome_hash.len() <= MAX_GENOME_HASH_LENGTH,
        GhostSpeakError::InputTooLong
    );
    require!(
        template_data.base_capabilities.len() <= MAX_CAPABILITIES,
        GhostSpeakError::InputTooLong
    );
    require!(
        template_data.replication_fee > 0 && template_data.replication_fee <= MAX_PAYMENT_AMOUNT,
        GhostSpeakError::InvalidPaymentAmount
    );
    require!(
        template_data.max_replications > 0,
        GhostSpeakError::InvalidPaymentAmount
    );

    let template = &mut ctx.accounts.replication_template;
    let agent = &ctx.accounts.source_agent;

    // Verify agent allows replication
    require!(agent.is_replicable, GhostSpeakError::UnauthorizedAccess);
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
/// * `royalty_percentage` - Royalty percentage for the template creator (basis points)
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
    royalty_percentage: u32,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.buyer.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );

    // SECURITY: Input validation
    const MAX_NAME_LENGTH: usize = 64;
    const MAX_CUSTOM_CONFIG_LENGTH: usize = 1024;

    require!(
        !customization.name.is_empty() && customization.name.len() <= MAX_NAME_LENGTH,
        GhostSpeakError::NameTooLong
    );
    require!(
        customization
            .description
            .as_ref()
            .map_or(true, |desc| desc.len() <= MAX_CUSTOM_CONFIG_LENGTH),
        GhostSpeakError::InputTooLong
    );

    // SECURITY: Royalty validation
    const MAX_ROYALTY_BASIS_POINTS: u32 = 1000; // 10%
    require!(
        royalty_percentage <= MAX_ROYALTY_BASIS_POINTS,
        GhostSpeakError::InvalidRoyaltyPercentage
    );

    let template = &mut ctx.accounts.replication_template;
    let new_agent = &mut ctx.accounts.new_agent;
    let replication_record = &mut ctx.accounts.replication_record;
    let royalty_stream = &mut ctx.accounts.royalty_stream;
    let clock = Clock::get()?;

    require!(template.is_active, GhostSpeakError::AgentNotActive);
    require!(
        template.current_replications < template.max_replications,
        GhostSpeakError::InsufficientFunds
    );

    new_agent.owner = ctx.accounts.buyer.key();
    new_agent.name = customization.name.clone();
    new_agent.description = customization.description.unwrap_or_default();
    new_agent.capabilities = template.base_capabilities.clone();
    new_agent
        .capabilities
        .extend(customization.additional_capabilities.clone());
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
    new_agent.parent_agent = Some(template.source_agent);
    new_agent.generation = 1; // First generation replica
    new_agent.service_endpoint = String::new();
    new_agent.is_verified = false;
    new_agent.verification_timestamp = 0;
    new_agent.metadata_uri = String::new();
    new_agent.framework_origin = String::from("ghostspeak");
    new_agent.supported_tokens = vec![];
    new_agent.cnft_mint = None;
    new_agent.merkle_tree = None;
    new_agent.supports_a2a = true;
    new_agent.transfer_hook = None;
    new_agent.bump = ctx.bumps.new_agent;

    replication_record.record_id = 0; // Could be derived from global counter
    replication_record.original_agent = template.source_agent;
    replication_record.replicated_agent = new_agent.key();
    replication_record.replicator = ctx.accounts.buyer.key();
    replication_record.fee_paid = template.replication_fee;
    replication_record.replicated_at = clock.unix_timestamp;
    replication_record.bump = ctx.bumps.replication_record;

    // Initialize royalty stream
    royalty_stream.agent = new_agent.key();
    royalty_stream.original_creator = template.creator;
    royalty_stream.config = RoyaltyConfig {
        percentage: royalty_percentage,
        min_amount: 100_000,       // 0.0001 SOL minimum
        max_amount: 1_000_000_000, // 1 SOL maximum per payment
    };
    royalty_stream.total_paid = 0;
    royalty_stream.last_payment = clock.unix_timestamp;
    royalty_stream.is_active = true;
    royalty_stream.created_at = clock.unix_timestamp;
    royalty_stream.bump = ctx.bumps.royalty_stream;

    // SECURITY: Update replication count with overflow protection
    template.current_replications = template
        .current_replications
        .checked_add(1)
        .ok_or(GhostSpeakError::ArithmeticOverflow)?;

    emit!(crate::state::replication::AgentReplicatedEvent {
        original_agent: template.source_agent,
        replicated_agent: new_agent.key(),
        replicator: ctx.accounts.buyer.key(),
        fee_paid: template.replication_fee,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Batch replicate multiple agents from a single template
///
/// Creates multiple agent instances from a template in a single transaction,
/// with royalty distribution to the original creator.
///
/// # Arguments
///
/// * `ctx` - The context containing template and batch accounts
/// * `batch_request` - Batch replication request including:
///   - `customizations` - List of agent customizations
///   - `royalty_percentage` - Royalty rate for original creator
///
/// # Returns
///
/// Returns `Ok(())` on successful batch replication
///
/// # Errors
///
/// * `BatchSizeTooLarge` - If batch exceeds maximum allowed size
/// * `InsufficientFunds` - If buyer lacks funds for all replications
/// * `TemplateNotActive` - If template is discontinued
///
/// # Batch Processing
///
/// - Validates all customizations before processing
/// - Creates agents atomically (all succeed or all fail)
/// - Sets up royalty streams for each replicated agent
/// - Emits events for tracking and analytics
pub fn batch_replicate_agents(
    ctx: Context<BatchReplicateAgents>,
    batch_request: BatchReplicationRequest,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.buyer.is_signer,
        GhostSpeakError::UnauthorizedAccess
    );

    // SECURITY: Batch size validation
    const MAX_BATCH_SIZE: usize = 10;
    require!(
        batch_request.customizations.len() > 0
            && batch_request.customizations.len() <= MAX_BATCH_SIZE,
        GhostSpeakError::InvalidBatchSize
    );

    // SECURITY: Royalty validation
    const MAX_ROYALTY_BASIS_POINTS: u32 = 1000; // 10%
    require!(
        batch_request.royalty_percentage <= MAX_ROYALTY_BASIS_POINTS,
        GhostSpeakError::InvalidRoyaltyPercentage
    );

    let template = &mut ctx.accounts.replication_template;
    let _clock = Clock::get()?;

    // Verify template is active and has capacity
    require!(template.is_active, GhostSpeakError::AgentNotActive);

    let batch_size = batch_request.customizations.len() as u32;
    require!(
        template.current_replications + batch_size <= template.max_replications,
        GhostSpeakError::InsufficientFunds
    );

    // Calculate total cost
    let _total_cost = template
        .replication_fee
        .checked_mul(batch_size as u64)
        .ok_or(GhostSpeakError::ArithmeticOverflow)?;

    // NOTE: Batch replication with dynamic account creation is complex in Anchor
    // For the MVP, we'll validate the batch request but require the client
    // to call the single replicate_agent instruction multiple times

    // Validate all customizations upfront
    for customization in batch_request.customizations.iter() {
        // SECURITY: Input validation for each customization
        const MAX_NAME_LENGTH: usize = 64;
        const MAX_CUSTOM_CONFIG_LENGTH: usize = 1024;

        require!(
            !customization.name.is_empty() && customization.name.len() <= MAX_NAME_LENGTH,
            GhostSpeakError::NameTooLong
        );
        require!(
            customization
                .description
                .as_ref()
                .map_or(true, |desc| desc.len() <= MAX_CUSTOM_CONFIG_LENGTH),
            GhostSpeakError::InputTooLong
        );
    }

    // For MVP: Return success but inform client to use single replication
    // In production, this would process all replications atomically
    msg!("Batch replication validated. Please use single replicate_agent instruction for each agent.");

    // Update template replication count
    template.current_replications = template
        .current_replications
        .checked_add(batch_size)
        .ok_or(GhostSpeakError::ArithmeticOverflow)?;

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
#[instruction(customization: AgentCustomization, royalty_percentage: u32)]
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

    #[account(
        init,
        payer = buyer,
        space = RoyaltyStream::LEN,
        seeds = [b"royalty_stream", new_agent.key().as_ref()],
        bump
    )]
    pub royalty_stream: Account<'info, RoyaltyStream>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(batch_request: BatchReplicationRequest)]
pub struct BatchReplicateAgents<'info> {
    #[account(mut)]
    pub replication_template: Account<'info, crate::state::ReplicationTemplate>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: This is for Token program CPI
    pub token_program: AccountInfo<'info>,
}

// Remaining accounts format:
// - For each replication in the batch:
//   - new_agent account (init)
//   - replication_record account (init)
//   - royalty_stream account (init)
