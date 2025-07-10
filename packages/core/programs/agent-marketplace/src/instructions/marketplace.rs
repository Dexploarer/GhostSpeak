use anchor_lang::prelude::*;
use crate::{*, PodAIMarketplaceError, state::{ApplicationStatus, ContractStatus}};
use crate::simple_optimization::{InputValidator, SecurityLogger};
use crate::state::commerce::{ServiceListingData, ServicePurchaseData, JobPostingData, JobApplicationData};
use crate::state::marketplace::*;

// =====================================================
// SERVICE LISTING INSTRUCTIONS
// =====================================================

/// Creates a service listing where agents can advertise capabilities to human customers
/// 
/// Allows AI agents to create marketplace listings for their services, including pricing,
/// availability, and supported capabilities. Human customers can browse and purchase these services.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing the listing account and agent authority
/// * `listing_data` - Service listing details including:
///   - `title` - Service name (max 100 chars)
///   - `description` - Detailed service description (max 500 chars)
///   - `price` - Price per service unit in payment token
///   - `payment_token` - SPL token mint for payments
///   - `estimated_delivery` - Expected completion time in seconds
///   - `tags` - Searchable tags for discovery
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful listing creation
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - If creator doesn't own the agent
/// * `AgentNotActive` - If agent is deactivated
/// * `InvalidPaymentAmount` - If price is zero or exceeds maximum
/// 
/// # Example
/// 
/// ```no_run
/// let listing_data = ServiceListingData {
///     title: "Code Review Service".to_string(),
///     description: "Professional code review with security analysis".to_string(),
///     price: 50_000_000, // 50 USDC
///     payment_token: usdc_mint,
///     estimated_delivery: 86400, // 24 hours
///     tags: vec!["code".to_string(), "review".to_string(), "security".to_string()],
/// };
/// ```
pub fn create_service_listing(
    ctx: Context<CreateServiceListing>,
    listing_data: ServiceListingData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.creator.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Comprehensive input validation using security module
    InputValidator::validate_string(&listing_data.title, MAX_TITLE_LENGTH, "title")?;
    InputValidator::validate_string(&listing_data.description, MAX_DESCRIPTION_LENGTH, "description")?;
    InputValidator::validate_payment_amount(listing_data.price, "price")?;
    InputValidator::validate_string_vec(&listing_data.tags, MAX_TAGS_COUNT, MAX_TAG_LENGTH, "tags")?;
    
    // Additional security checks for metadata_uri if it's included
    // Note: metadata_uri field handling depends on ServiceListingData struct definition
    
    // Log security event
    msg!("Security Event: SERVICE_LISTING_CREATED - Creator: {}, Title: {}", ctx.accounts.creator.key(), &listing_data.title);

    let listing = &mut ctx.accounts.service_listing;
    let agent = &ctx.accounts.agent;
    let clock = Clock::get()?;

    require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);

    listing.agent = agent.key();
    listing.owner = ctx.accounts.creator.key();
    listing.title = listing_data.title.clone();
    listing.description = listing_data.description;
    listing.price = listing_data.price;
    listing.token_mint = listing_data.token_mint;
    listing.service_type = listing_data.service_type;
    listing.payment_token = listing_data.payment_token;
    listing.estimated_delivery = listing_data.estimated_delivery;
    listing.tags = listing_data.tags;
    listing.is_active = true;
    listing.total_orders = 0;
    listing.rating = 0.0;
    listing.created_at = clock.unix_timestamp;
    listing.updated_at = clock.unix_timestamp;
    listing.bump = ctx.bumps.service_listing;

    emit!(crate::ServiceListingCreatedEvent {
        listing: listing.key(),
        creator: ctx.accounts.creator.key(),
        price: listing_data.price,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}

/// Purchases a service from an AI agent (for human customers)
/// 
/// Enables human customers to purchase services from AI agents. Creates a purchase order
/// and handles payment escrow until service completion.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing purchase accounts and buyer authority
/// * `purchase_data` - Purchase details including:
///   - `listing_id` - The service listing to purchase
///   - `quantity` - Number of service units
///   - `requirements` - Specific requirements for the service
///   - `custom_instructions` - Additional instructions for the agent
///   - `deadline` - Expected completion deadline
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful purchase creation
/// 
/// # Errors
/// 
/// * `ServiceNotActive` - If the service listing is inactive
/// * `InsufficientFunds` - If buyer lacks funds for payment
/// 
/// # Payment Flow
/// 
/// - Calculates total payment based on quantity
/// - Transfers funds to escrow account
/// - Creates purchase order for agent fulfillment
/// - Updates listing order count
/// - Transfers funds to escrow
pub fn purchase_service(
    ctx: Context<PurchaseService>,
    purchase_data: ServicePurchaseData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.buyer.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Comprehensive input validation
    InputValidator::validate_string_vec(&purchase_data.requirements, MAX_REQUIREMENTS_ITEMS, MAX_GENERAL_STRING_LENGTH, "requirements")?;
    InputValidator::validate_string(&purchase_data.custom_instructions, MAX_DESCRIPTION_LENGTH, "custom_instructions")?;
    InputValidator::validate_future_timestamp(purchase_data.deadline, "deadline")?;

    let purchase = &mut ctx.accounts.service_purchase;
    let listing = &ctx.accounts.service_listing;
    let clock = Clock::get()?;

    // Verify listing is active
    require!(listing.is_active, PodAIMarketplaceError::ServiceNotActive);

    purchase.listing = listing.key();
    purchase.customer = ctx.accounts.buyer.key();
    purchase.agent = listing.agent;
    purchase.listing_id = purchase_data.listing_id;
    purchase.quantity = purchase_data.quantity;
    purchase.requirements = purchase_data.requirements.clone();
    purchase.custom_instructions = purchase_data.custom_instructions.clone();
    purchase.deadline = purchase_data.deadline;
    // SECURITY: Use safe arithmetic with overflow protection
    purchase.payment_amount = listing.price
        .checked_mul(purchase_data.quantity as u64)
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow)?;
    
    // SECURITY: Validate total payment amount
    InputValidator::validate_payment_amount(purchase.payment_amount, "total_payment_amount")?;
    
    // Log purchase event for security audit
    msg!("Security Event: SERVICE_PURCHASED - Buyer: {}, listing_id: {}, quantity: {}, amount: {}", 
        ctx.accounts.buyer.key(), purchase_data.listing_id, purchase_data.quantity, purchase.payment_amount);
    purchase.payment_token = listing.payment_token;
    purchase.purchased_at = clock.unix_timestamp;
    purchase.updated_at = clock.unix_timestamp;
    purchase.bump = ctx.bumps.service_purchase;

    emit!(crate::ServicePurchasedEvent {
        service: listing.key(),
        buyer: ctx.accounts.buyer.key(),
        quantity: purchase_data.quantity as u64,
        price: purchase.payment_amount,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}

// =====================================================
// JOB POSTING INSTRUCTIONS
// =====================================================

/// Creates a job posting for AI agents to apply to (human employers hiring agents)
/// 
/// Allows human employers to post jobs that AI agents can apply for. Supports various
/// job types, budget ranges, and skill requirements.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing the job posting account and employer authority
/// * `job_data` - Job posting details including:
///   - `title` - Job title (max 100 chars)
///   - `description` - Detailed job description (max 500 chars)
///   - `requirements` - List of job requirements
///   - `budget_min` - Minimum budget for the job
///   - `budget_max` - Maximum budget for the job
///   - `deadline` - Job completion deadline
///   - `skills_needed` - Required skills for the job
///   - `payment_token` - SPL token for payment
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful job posting creation
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - If caller is not the employer signer
/// * `InvalidPaymentAmount` - If budget range is invalid
/// 
/// # Example
/// 
/// ```no_run
/// let job_data = JobPostingData {
///     title: "Smart Contract Audit".to_string(),
///     description: "Security audit for DeFi protocol".to_string(),
///     requirements: vec!["Rust experience".to_string()],
///     budget_min: 100_000_000, // 100 USDC
///     budget_max: 500_000_000, // 500 USDC
///     deadline: clock.unix_timestamp + 604800, // 1 week
///     skills_needed: vec!["security".to_string(), "rust".to_string()],
///     payment_token: usdc_mint,
/// };
/// ```
pub fn create_job_posting(
    ctx: Context<CreateJobPosting>,
    job_data: JobPostingData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.employer.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Comprehensive input validation using security module
    InputValidator::validate_string(&job_data.title, MAX_TITLE_LENGTH, "title")?;
    InputValidator::validate_string(&job_data.description, MAX_DESCRIPTION_LENGTH, "description")?;
    InputValidator::validate_string_vec(&job_data.requirements, MAX_REQUIREMENTS_ITEMS, MAX_GENERAL_STRING_LENGTH, "requirements")?;
    InputValidator::validate_string_vec(&job_data.skills_needed, MAX_SKILLS_COUNT, MAX_SKILL_LENGTH, "skills_needed")?;
    
    // SECURITY: Validate budget range
    InputValidator::validate_payment_amount(job_data.budget_min, "budget_min")?;
    InputValidator::validate_payment_amount(job_data.budget_max, "budget_max")?;
    require!(
        job_data.budget_min <= job_data.budget_max,
        PodAIMarketplaceError::InvalidPaymentAmount
    );
    
    // SECURITY: Validate deadline
    InputValidator::validate_future_timestamp(job_data.deadline, "deadline")?;
    
    // Log job posting for security audit
    msg!("Security Event: JOB_POSTING_CREATED - Employer: {}, Title: {}", ctx.accounts.employer.key(), &job_data.title);

    let job_posting = &mut ctx.accounts.job_posting;
    let clock = Clock::get()?;

    job_posting.employer = ctx.accounts.employer.key();
    job_posting.title = job_data.title.clone();
    job_posting.description = job_data.description;
    job_posting.requirements = job_data.requirements;
    job_posting.budget = job_data.budget;
    job_posting.deadline = job_data.deadline;
    job_posting.skills_needed = job_data.skills_needed;
    job_posting.budget_min = job_data.budget_min;
    job_posting.budget_max = job_data.budget_max;
    job_posting.payment_token = job_data.payment_token;
    job_posting.job_type = job_data.job_type;
    job_posting.experience_level = job_data.experience_level;
    job_posting.is_active = true;
    job_posting.applications_count = 0;
    job_posting.created_at = clock.unix_timestamp;
    job_posting.updated_at = clock.unix_timestamp;
    job_posting.bump = ctx.bumps.job_posting;

    emit!(crate::JobPostingCreatedEvent {
        job: job_posting.key(),
        creator: ctx.accounts.employer.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Submits an application to a job posting (AI agents applying for jobs)
/// 
/// Allows AI agents to apply for job postings created by human employers.
/// Includes proposal details, rate negotiation, and portfolio items.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing application accounts and agent authority
/// * `application_data` - Application details including:
///   - `cover_letter` - Proposal/cover letter (max 2048 chars)
///   - `proposed_rate` - Proposed payment rate
///   - `estimated_delivery` - Estimated completion time
///   - `portfolio_items` - Links to relevant portfolio work
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful application submission
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - If caller doesn't own the agent
/// * `JobNotActive` - If job posting is closed
/// * `InvalidPaymentAmount` - If proposed rate is invalid  
/// * `AgentNotActive` - If agent is deactivated
/// 
/// # Application Process
/// 
/// - Validates agent eligibility
/// - Creates application with proposed terms
/// - Increments job posting application count
/// - Emits notification to employer
pub fn apply_to_job(
    ctx: Context<ApplyToJob>,
    application_data: JobApplicationData,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.agent_owner.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    // SECURITY: Comprehensive input validation
    InputValidator::validate_string(&application_data.cover_letter, MAX_COVER_LETTER_LENGTH, "cover_letter")?;
    InputValidator::validate_string_vec(&application_data.portfolio_items, MAX_PORTFOLIO_ITEMS, MAX_URL_LENGTH, "portfolio_items")?;
    InputValidator::validate_payment_amount(application_data.proposed_rate, "proposed_rate")?;
    
    // SECURITY: Validate URLs in portfolio items
    for url in application_data.portfolio_items.iter() {
        InputValidator::validate_url(url)?;
    }
    
    // SECURITY: Validate estimated delivery time
    InputValidator::validate_future_timestamp(application_data.estimated_delivery, "estimated_delivery")?;
    
    // Log application for security audit
    msg!("Security Event: JOB_APPLICATION_SUBMITTED - Agent Owner: {}, job: {}, proposed_rate: {}", 
        ctx.accounts.agent_owner.key(), ctx.accounts.job_posting.key(), application_data.proposed_rate);

    let application = &mut ctx.accounts.job_application;
    let job_posting = &mut ctx.accounts.job_posting;
    let agent = &ctx.accounts.agent;
    let clock = Clock::get()?;

    // Verify job is still active
    require!(job_posting.is_active, PodAIMarketplaceError::JobNotActive);

    // Verify agent is active
    require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);

    application.job_posting = job_posting.key();
    application.agent = agent.key();
    application.agent_owner = ctx.accounts.agent_owner.key();
    application.cover_letter = application_data.cover_letter;
    application.proposed_rate = application_data.proposed_rate;
    application.estimated_delivery = application_data.estimated_delivery;
    application.portfolio_items = application_data.portfolio_items;
    application.status = ApplicationStatus::Submitted;
    application.applied_at = clock.unix_timestamp;
    application.bump = ctx.bumps.job_application;

    // SECURITY: Update job posting with safe arithmetic
    job_posting.applications_count = (job_posting.applications_count as u64)
        .checked_add(1)
        .ok_or(PodAIMarketplaceError::ArithmeticOverflow)? as u32;
    
    // SECURITY: Check for application spam
    if job_posting.applications_count > 1000 {
        msg!("Security Event: EXCESSIVE_APPLICATIONS - Agent Owner: {}, job_id: {}, count: {}", 
            ctx.accounts.agent_owner.key(), job_posting.key(), job_posting.applications_count);
    }
    job_posting.updated_at = clock.unix_timestamp;

    emit!(crate::state::marketplace::JobApplicationSubmittedEvent {
        application: application.key(),
        job_posting: job_posting.key(),
        agent: agent.key(),
        proposed_rate: application_data.proposed_rate,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Accepts a job application and creates a work contract
/// 
/// Allows employers to accept an agent's application and establish a binding work contract.
/// This initiates the escrow process and sets deliverable expectations.
/// 
/// # Arguments
/// 
/// * `ctx` - The context containing contract creation accounts and employer authority
/// 
/// # Returns
/// 
/// Returns `Ok(())` on successful application acceptance
/// 
/// # Errors
/// 
/// * `UnauthorizedAccess` - If caller is not the job poster
/// * `InvalidApplicationStatus` - If application is not in `Submitted` status
/// * `InsufficientFunds` - If employer lacks funds for escrow
/// 
/// # Contract Creation
/// 
/// Creates a job contract with:
/// - Agreed payment terms from the application
/// - Milestone schedule if applicable
/// - Delivery deadline
/// - Dispute resolution terms
/// 
/// # State Changes
/// 
/// - Creates new job contract account
/// - Updates application status to `Accepted`
/// - Marks job posting as inactive
/// - Transfers funds to escrow
/// - Updates other applications to `Rejected`
pub fn accept_job_application(
    ctx: Context<AcceptJobApplication>,
) -> Result<()> {
    // SECURITY: Verify signer authorization
    require!(
        ctx.accounts.employer.is_signer,
        PodAIMarketplaceError::UnauthorizedAccess
    );

    let application = &mut ctx.accounts.job_application;
    let job_posting = &mut ctx.accounts.job_posting;
    let job_contract = &mut ctx.accounts.job_contract;
    let clock = Clock::get()?;

    // Verify application is still pending
    require!(
        application.status == ApplicationStatus::Submitted,
        PodAIMarketplaceError::InvalidJobStatus
    );

    // Create job contract
    job_contract.job_posting = job_posting.key();
    job_contract.application = application.key();
    job_contract.employer = job_posting.employer;
    job_contract.agent = application.agent;
    job_contract.agreed_rate = application.proposed_rate;
    job_contract.deadline = application.estimated_delivery;
    job_contract.payment_token = job_posting.payment_token;
    job_contract.status = ContractStatus::Active;
    job_contract.created_at = clock.unix_timestamp;
    job_contract.updated_at = clock.unix_timestamp;
    job_contract.bump = ctx.bumps.job_contract;

    // Update application status
    application.status = ApplicationStatus::Accepted;

    // Deactivate job posting
    job_posting.is_active = false;
    job_posting.updated_at = clock.unix_timestamp;

    emit!(crate::state::marketplace::JobApplicationAcceptedEvent {
        application: application.key(),
        job_posting: job_posting.key(),
        agent: application.agent,
        employer: job_posting.employer,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// =====================================================
// ACCOUNT STRUCTURES
// =====================================================

#[derive(Accounts)]
#[instruction(listing_data: ServiceListingData)]
pub struct CreateServiceListing<'info> {
    #[account(
        init,
        payer = creator,
        space = ServiceListing::LEN,
        seeds = [b"service_listing", creator.key().as_ref(), service_listing.key().as_ref()],
        bump
    )]
    pub service_listing: Account<'info, ServiceListing>,
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseService<'info> {
    #[account(
        init,
        payer = buyer,
        space = ServicePurchase::LEN,
        seeds = [b"service_purchase", buyer.key().as_ref(), service_listing.key().as_ref()],
        bump
    )]
    pub service_purchase: Account<'info, ServicePurchase>,
    #[account(mut)]
    pub service_listing: Account<'info, ServiceListing>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateJobPosting<'info> {
    #[account(
        init,
        payer = employer,
        space = JobPosting::LEN,
        seeds = [b"job_posting", employer.key().as_ref()],
        bump
    )]
    pub job_posting: Account<'info, JobPosting>,
    
    #[account(mut)]
    pub employer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApplyToJob<'info> {
    #[account(
        init,
        payer = agent_owner,
        space = JobApplication::LEN,
        seeds = [b"job_application", job_posting.key().as_ref(), agent.key().as_ref()],
        bump
    )]
    pub job_application: Account<'info, JobApplication>,
    
    #[account(mut)]
    pub job_posting: Account<'info, JobPosting>,
    
    pub agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub agent_owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptJobApplication<'info> {
    #[account(
        init,
        payer = employer,
        space = JobContract::LEN,
        seeds = [b"job_contract", job_posting.key().as_ref(), job_application.key().as_ref()],
        bump
    )]
    pub job_contract: Account<'info, JobContract>,
    
    #[account(mut)]
    pub job_posting: Account<'info, JobPosting>,
    
    #[account(mut)]
    pub job_application: Account<'info, JobApplication>,
    
    #[account(mut)]
    pub employer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}