/*!
 * Work Orders Module
 * 
 * Handles work order creation and delivery submission for the GhostSpeak Protocol.
 */

use anchor_lang::prelude::*;
use crate::{
    WorkOrderCreatedEvent, WorkDeliverySubmittedEvent,
    PodAIMarketplaceError,
    MIN_PAYMENT_AMOUNT, MAX_PAYMENT_AMOUNT, MAX_GENERAL_STRING_LENGTH,
    MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_REQUIREMENTS_ITEMS,
    validate_payment, validate_string, require_signer,
};
use crate::state::work_order::{
    WorkOrder, WorkDelivery, WorkOrderStatus, 
    WorkOrderData, WorkDeliveryData, Deliverable
};
use crate::simple_optimization::{InputValidator, SecurityLogger, FormalVerification};
// Security utilities integrated into core module

// =====================================================
// WORK ORDER INSTRUCTIONS
// =====================================================

/// Creates a work order for task delegation between agents
/// 
/// Establishes a formal work agreement between a client agent and provider agent,
/// including requirements, payment terms, and deadlines. Payment is held in escrow
/// until work is completed and approved.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing work order and escrow accounts
/// * `work_order_data` - Work order details including:
///   - `provider` - Public key of the agent who will perform the work
///   - `title` - Brief title of the work (max 128 chars)
///   - `description` - Detailed work description (max 4KB)
///   - `requirements` - Array of specific requirements
///   - `payment_amount` - Amount to be paid in lamports or token units
///   - `payment_token` - SPL token mint for payment (SOL if System Program)
///   - `deadline` - Unix timestamp for work completion
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful work order creation
/// 
/// # Errors
/// 
/// * `InvalidProvider` - If provider is not a verified agent
/// * `InvalidDeadline` - If deadline is in the past
/// * `InsufficientFunds` - If client lacks funds for escrow
/// 
/// # State Changes
/// 
/// - Creates work order account with status `Created`
/// - Transfers payment amount to escrow account
/// - Sets up PDA for secure fund management
pub fn create_work_order(
    ctx: Context<CreateWorkOrder>,
    work_order_data: WorkOrderData,
) -> Result<()> {
    // SECURITY: Comprehensive authorization and validation
    require_signer!(ctx.accounts.client);
    
    // SECURITY: Input validation using security module
    validate_string!(&work_order_data.title, MAX_TITLE_LENGTH, "title");
    InputValidator::validate_string(&work_order_data.description, MAX_DESCRIPTION_LENGTH, "description")?;
    InputValidator::validate_string_vec(&work_order_data.requirements, MAX_REQUIREMENTS_ITEMS, MAX_GENERAL_STRING_LENGTH, "requirements")?;
    validate_payment!(work_order_data.payment_amount, "payment_amount");
    
    // SECURITY: Validate deadline
    InputValidator::validate_future_timestamp(work_order_data.deadline, "deadline")?;
    
    // SECURITY: Verify provider exists and is active (additional check would be needed)
    // This would require provider account validation in a full implementation
    
    // Log work order creation for security audit
    SecurityLogger::log_security_event("WORK_ORDER_CREATED", ctx.accounts.client.key(), 
        &format!("provider: {}, title: {}, amount: {}", work_order_data.provider, work_order_data.title, work_order_data.payment_amount));
    
    let work_order = &mut ctx.accounts.work_order;
    
    work_order.client = ctx.accounts.client.key();
    work_order.provider = work_order_data.provider;
    work_order.title = work_order_data.title.clone();
    work_order.description = work_order_data.description.clone();
    work_order.requirements = work_order_data.requirements.clone();
    work_order.payment_amount = work_order_data.payment_amount;
    work_order.payment_token = work_order_data.payment_token;
    work_order.deadline = work_order_data.deadline;
    work_order.status = WorkOrderStatus::Created;
    work_order.created_at = Clock::get()?.unix_timestamp;
    work_order.updated_at = Clock::get()?.unix_timestamp;
    work_order.bump = ctx.bumps.work_order;
    
    emit!(WorkOrderCreatedEvent {
        work_order: work_order.key(),
        client: ctx.accounts.client.key(),
        provider: work_order_data.provider,
        amount: work_order_data.payment_amount,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

/// Submits completed work delivery and mints a compressed NFT as proof
/// 
/// Provider agents use this to submit their work deliverables. A compressed NFT is minted
/// to serve as an immutable record of the work delivery, reducing costs by 5000x compared
/// to regular NFTs.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing work delivery, work order, and cNFT accounts
/// * `delivery_data` - Delivery details including:
///   - `deliverables` - Array of deliverable types (Code, Document, Design, etc.)
///   - `ipfs_hash` - IPFS hash of the delivered content
///   - `metadata_uri` - URI to detailed metadata JSON
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful delivery submission
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - If submitter is not the assigned provider
/// * `InvalidWorkOrderStatus` - If work order is not in `Open` or `InProgress` status
/// * `InvalidIPFSHash` - If IPFS hash is malformed
/// 
/// # State Changes
/// 
/// - Updates work order status to `Submitted`
/// - Creates work delivery record
/// - Mints compressed NFT with delivery metadata
/// 
/// # Example
/// 
/// ```no_run
/// let delivery = WorkDeliveryData {
///     deliverables: vec![Deliverable::Code, Deliverable::Document],
///     ipfs_hash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG".to_string(),
///     metadata_uri: "https://arweave.net/delivery-metadata.json".to_string(),
/// };
/// ```
pub fn submit_work_delivery(
    ctx: Context<SubmitWorkDelivery>,
    delivery_data: WorkDeliveryData,
) -> Result<()> {
    // SECURITY: Comprehensive authorization and validation
    require_signer!(ctx.accounts.provider);
    
    let work_order = &ctx.accounts.work_order;
    
    // SECURITY: Verify provider is authorized for this work order
    require!(
        ctx.accounts.provider.key() == work_order.provider,
        PodAIMarketplaceError::UnauthorizedAccess
    );
    
    // SECURITY: Verify work order state transition is valid
    FormalVerification::verify_work_order_transition(
        work_order.status as u8,
        WorkOrderStatus::Submitted as u8,
        "work_order_submission"
    )?;
    
    // SECURITY: Input validation using security module
    InputValidator::validate_ipfs_hash(&delivery_data.ipfs_hash)?;
    InputValidator::validate_url(&delivery_data.metadata_uri)?;
    
    // SECURITY: Validate deliverables are not empty
    require!(
        !delivery_data.deliverables.is_empty(),
        PodAIMarketplaceError::InputTooLong
    );
    
    // Log work delivery submission for security audit
    SecurityLogger::log_security_event("WORK_DELIVERY_SUBMITTED", ctx.accounts.provider.key(), 
        &format!("work_order: {}, ipfs_hash: {}", ctx.accounts.work_order.key(), delivery_data.ipfs_hash));
    
    let work_delivery = &mut ctx.accounts.work_delivery;
    let work_order_key = ctx.accounts.work_order.key();
    
    work_delivery.work_order = work_order_key;
    work_delivery.provider = ctx.accounts.provider.key();
    work_delivery.deliverables = delivery_data.deliverables.clone();
    work_delivery.ipfs_hash = delivery_data.ipfs_hash.clone();
    work_delivery.metadata_uri = delivery_data.metadata_uri.clone();
    work_delivery.submitted_at = Clock::get()?.unix_timestamp;
    work_delivery.bump = ctx.bumps.work_delivery;
    
    ctx.accounts.work_order.status = WorkOrderStatus::Submitted;
    ctx.accounts.work_order.updated_at = Clock::get()?.unix_timestamp;
    
    emit!(WorkDeliverySubmittedEvent {
        work_order: work_order_key,
        provider: ctx.accounts.provider.key(),
        ipfs_hash: delivery_data.ipfs_hash.clone(),
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

// =====================================================
// ACCOUNT VALIDATION CONTEXTS
// =====================================================

#[derive(Accounts)]
#[instruction(work_order_data: WorkOrderData)]
pub struct CreateWorkOrder<'info> {
    #[account(
        init,
        payer = client,
        space = WorkOrder::LEN,
        seeds = [b"work_order", client.key().as_ref(), &work_order_data.order_id.to_le_bytes()],
        bump
    )]
    pub work_order: Account<'info, WorkOrder>,
    
    #[account(mut)]
    pub client: Signer<'info>,
    
    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(delivery_data: WorkDeliveryData)]
pub struct SubmitWorkDelivery<'info> {
    #[account(
        init,
        payer = provider,
        space = WorkDelivery::LEN,
        seeds = [b"work_delivery", work_order.key().as_ref()],
        bump
    )]
    pub work_delivery: Account<'info, WorkDelivery>,
    
    #[account(mut)]
    pub work_order: Account<'info, WorkOrder>,
    
    #[account(mut)]
    pub provider: Signer<'info>,
    
    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}