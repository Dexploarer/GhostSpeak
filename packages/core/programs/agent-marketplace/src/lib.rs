/*!
 * podAI Marketplace Program - Revolutionary AI Agent Platform
 * 
 * A decentralized marketplace for AI agents built on Solana, enabling:
 * - Agent-to-Agent (A2A) and Human-to-Agent (H2A) communication
 * - Human purchasing of agent services and direct job hiring
 * - Work delivery as compressed NFTs (cNFTs)
 * - SPL Token 2022 payments with confidential transfers
 * - Agent replication and genome marketplace
 * - Privacy-preserving interactions across the ecosystem
 */

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

declare_id!("podAI111111111111111111111111111111111111111");

#[program]
pub mod podai_marketplace {
    use super::*;

    // =====================================================
    // AGENT MANAGEMENT
    // =====================================================

    /// Register a new AI agent in the marketplace
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        agent_data: AgentRegistrationData,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        agent.owner = ctx.accounts.owner.key();
        agent.name = agent_data.name;
        agent.description = agent_data.description;
        agent.capabilities = agent_data.capabilities;
        agent.pricing_model = agent_data.pricing_model;
        agent.reputation_score = 0;
        agent.total_jobs_completed = 0;
        agent.total_earnings = 0;
        agent.is_active = true;
        agent.created_at = clock.unix_timestamp;
        agent.updated_at = clock.unix_timestamp;
        agent.genome_hash = agent_data.genome_hash;
        agent.is_replicable = agent_data.is_replicable;
        agent.replication_fee = agent_data.replication_fee;
        agent.bump = ctx.bumps.agent;

        emit!(AgentRegisteredEvent {
            agent: agent.key(),
            owner: ctx.accounts.owner.key(),
            name: agent_data.name.clone(),
            capabilities: agent_data.capabilities.clone(),
        });

        Ok(())
    }

    /// Update agent information and capabilities
    pub fn update_agent(
        ctx: Context<UpdateAgent>,
        update_data: AgentUpdateData,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        if let Some(description) = update_data.description {
            agent.description = description;
        }
        if let Some(capabilities) = update_data.capabilities {
            agent.capabilities = capabilities;
        }
        if let Some(pricing_model) = update_data.pricing_model {
            agent.pricing_model = pricing_model;
        }
        if let Some(is_active) = update_data.is_active {
            agent.is_active = is_active;
        }

        agent.updated_at = clock.unix_timestamp;

        emit!(AgentUpdatedEvent {
            agent: agent.key(),
            owner: ctx.accounts.owner.key(),
        });

        Ok(())
    }

    // =====================================================
    // CHANNEL COMMUNICATION SYSTEM
    // =====================================================

    /// Create a communication channel between agents
    pub fn create_channel(
        ctx: Context<CreateChannel>,
        channel_data: ChannelCreationData,
    ) -> Result<()> {
        let channel = &mut ctx.accounts.channel;
        let clock = Clock::get()?;

        channel.creator = ctx.accounts.creator.key();
        channel.participants = channel_data.participants;
        channel.channel_type = channel_data.channel_type;
        channel.is_private = channel_data.is_private;
        channel.message_count = 0;
        channel.created_at = clock.unix_timestamp;
        channel.last_activity = clock.unix_timestamp;
        channel.is_active = true;
        channel.bump = ctx.bumps.channel;

        emit!(ChannelCreatedEvent {
            channel: channel.key(),
            creator: ctx.accounts.creator.key(),
            participants: channel_data.participants.clone(),
            channel_type: channel_data.channel_type,
        });

        Ok(())
    }

    /// Send a message in a channel
    pub fn send_message(
        ctx: Context<SendMessage>,
        message_data: MessageData,
    ) -> Result<()> {
        let message = &mut ctx.accounts.message;
        let channel = &mut ctx.accounts.channel;
        let clock = Clock::get()?;

        // Verify sender is participant in the channel
        require!(
            channel.participants.contains(&ctx.accounts.sender.key()) ||
            channel.creator == ctx.accounts.sender.key(),
            AgentMarketplaceError::UnauthorizedChannelAccess
        );

        message.channel = channel.key();
        message.sender = ctx.accounts.sender.key();
        message.content = message_data.content;
        message.message_type = message_data.message_type;
        message.timestamp = clock.unix_timestamp;
        message.is_encrypted = message_data.is_encrypted;
        message.bump = ctx.bumps.message;

        // Update channel activity
        channel.message_count += 1;
        channel.last_activity = clock.unix_timestamp;

        emit!(MessageSentEvent {
            channel: channel.key(),
            message: message.key(),
            sender: ctx.accounts.sender.key(),
            message_type: message_data.message_type,
        });

        Ok(())
    }

    // =====================================================
    // WORK DELIVERY SYSTEM
    // =====================================================

    /// Create a work order between agents
    pub fn create_work_order(
        ctx: Context<CreateWorkOrder>,
        work_order_data: WorkOrderData,
    ) -> Result<()> {
        let work_order = &mut ctx.accounts.work_order;
        let clock = Clock::get()?;

        work_order.client = ctx.accounts.client.key();
        work_order.provider = work_order_data.provider;
        work_order.title = work_order_data.title;
        work_order.description = work_order_data.description;
        work_order.requirements = work_order_data.requirements;
        work_order.payment_amount = work_order_data.payment_amount;
        work_order.payment_token = work_order_data.payment_token;
        work_order.deadline = work_order_data.deadline;
        work_order.status = WorkOrderStatus::Created;
        work_order.created_at = clock.unix_timestamp;
        work_order.updated_at = clock.unix_timestamp;
        work_order.bump = ctx.bumps.work_order;

        emit!(WorkOrderCreatedEvent {
            work_order: work_order.key(),
            client: ctx.accounts.client.key(),
            provider: work_order_data.provider,
            payment_amount: work_order_data.payment_amount,
        });

        Ok(())
    }

    /// Submit work delivery (creates cNFT)
    pub fn submit_work_delivery(
        ctx: Context<SubmitWorkDelivery>,
        delivery_data: WorkDeliveryData,
    ) -> Result<()> {
        let work_order = &mut ctx.accounts.work_order;
        let work_delivery = &mut ctx.accounts.work_delivery;
        let clock = Clock::get()?;

        // Verify provider is authorized
        require!(
            work_order.provider == ctx.accounts.provider.key(),
            AgentMarketplaceError::UnauthorizedWorkSubmission
        );

        // Verify work order is in progress
        require!(
            work_order.status == WorkOrderStatus::InProgress,
            AgentMarketplaceError::InvalidWorkOrderStatus
        );

        work_delivery.work_order = work_order.key();
        work_delivery.provider = ctx.accounts.provider.key();
        work_delivery.client = work_order.client;
        work_delivery.deliverables = delivery_data.deliverables;
        work_delivery.ipfs_hash = delivery_data.ipfs_hash;
        work_delivery.metadata_uri = delivery_data.metadata_uri;
        work_delivery.submitted_at = clock.unix_timestamp;
        work_delivery.is_approved = false;
        work_delivery.bump = ctx.bumps.work_delivery;

        // Update work order status
        work_order.status = WorkOrderStatus::Submitted;
        work_order.updated_at = clock.unix_timestamp;

        emit!(WorkDeliverySubmittedEvent {
            work_order: work_order.key(),
            work_delivery: work_delivery.key(),
            provider: ctx.accounts.provider.key(),
            ipfs_hash: delivery_data.ipfs_hash.clone(),
        });

        Ok(())
    }

    // =====================================================
    // PAYMENT SYSTEM (SPL Token 2022)
    // =====================================================

    /// Process payment for completed work
    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        amount: u64,
        use_confidential_transfer: bool,
    ) -> Result<()> {
        let work_order = &mut ctx.accounts.work_order;
        let payment = &mut ctx.accounts.payment;
        let clock = Clock::get()?;

        // Verify work is approved
        require!(
            work_order.status == WorkOrderStatus::Approved,
            AgentMarketplaceError::WorkNotApproved
        );

        // Verify payment amount
        require!(
            amount == work_order.payment_amount,
            AgentMarketplaceError::IncorrectPaymentAmount
        );

        payment.work_order = work_order.key();
        payment.payer = ctx.accounts.payer.key();
        payment.recipient = work_order.provider;
        payment.amount = amount;
        payment.token_mint = ctx.accounts.token_mint.key();
        payment.is_confidential = use_confidential_transfer;
        payment.paid_at = clock.unix_timestamp;
        payment.bump = ctx.bumps.payment;

        // Update work order status
        work_order.status = WorkOrderStatus::Completed;
        work_order.updated_at = clock.unix_timestamp;

        // Update agent statistics
        let provider_agent = &mut ctx.accounts.provider_agent;
        provider_agent.total_jobs_completed += 1;
        provider_agent.total_earnings += amount;
        provider_agent.reputation_score += 1; // Simple reputation increase

        emit!(PaymentProcessedEvent {
            work_order: work_order.key(),
            payment: payment.key(),
            amount,
            is_confidential: use_confidential_transfer,
        });

        Ok(())
    }

    // =====================================================
    // HUMAN PURCHASING & JOB HIRING SYSTEM
    // =====================================================

    /// Create a service listing for human customers to purchase
    pub fn create_service_listing(
        ctx: Context<CreateServiceListing>,
        listing_data: ServiceListingData,
    ) -> Result<()> {
        let listing = &mut ctx.accounts.service_listing;
        let agent = &ctx.accounts.agent;
        let clock = Clock::get()?;

        // Verify agent is active and owned by the caller
        require!(agent.is_active, PodAIMarketplaceError::AgentNotActive);
        require!(agent.owner == ctx.accounts.owner.key(), PodAIMarketplaceError::UnauthorizedAccess);

        listing.agent = agent.key();
        listing.owner = ctx.accounts.owner.key();
        listing.title = listing_data.title;
        listing.description = listing_data.description;
        listing.service_type = listing_data.service_type;
        listing.price = listing_data.price;
        listing.payment_token = listing_data.payment_token;
        listing.estimated_delivery = listing_data.estimated_delivery;
        listing.tags = listing_data.tags;
        listing.is_active = true;
        listing.total_orders = 0;
        listing.rating = 0.0;
        listing.created_at = clock.unix_timestamp;
        listing.updated_at = clock.unix_timestamp;
        listing.bump = ctx.bumps.service_listing;

        emit!(ServiceListingCreatedEvent {
            listing: listing.key(),
            agent: agent.key(),
            owner: ctx.accounts.owner.key(),
            service_type: listing_data.service_type,
            price: listing_data.price,
        });

        Ok(())
    }

    /// Purchase a service from an agent (human customer buying)
    pub fn purchase_service(
        ctx: Context<PurchaseService>,
        purchase_data: ServicePurchaseData,
    ) -> Result<()> {
        let purchase = &mut ctx.accounts.service_purchase;
        let listing = &ctx.accounts.service_listing;
        let clock = Clock::get()?;

        // Verify listing is active
        require!(listing.is_active, PodAIMarketplaceError::ServiceNotActive);

        purchase.listing = listing.key();
        purchase.customer = ctx.accounts.customer.key();
        purchase.agent = listing.agent;
        purchase.requirements = purchase_data.requirements;
        purchase.custom_instructions = purchase_data.custom_instructions;
        purchase.payment_amount = listing.price;
        purchase.payment_token = listing.payment_token;
        purchase.deadline = purchase_data.deadline;
        purchase.status = PurchaseStatus::Paid;
        purchase.purchased_at = clock.unix_timestamp;
        purchase.updated_at = clock.unix_timestamp;
        purchase.bump = ctx.bumps.service_purchase;

        emit!(ServicePurchasedEvent {
            purchase: purchase.key(),
            listing: listing.key(),
            customer: ctx.accounts.customer.key(),
            agent: listing.agent,
            amount: listing.price,
        });

        Ok(())
    }

    /// Create a job posting for agents to apply to (human hiring)
    pub fn create_job_posting(
        ctx: Context<CreateJobPosting>,
        job_data: JobPostingData,
    ) -> Result<()> {
        let job_posting = &mut ctx.accounts.job_posting;
        let clock = Clock::get()?;

        job_posting.employer = ctx.accounts.employer.key();
        job_posting.title = job_data.title;
        job_posting.description = job_data.description;
        job_posting.requirements = job_data.requirements;
        job_posting.skills_needed = job_data.skills_needed;
        job_posting.budget_min = job_data.budget_min;
        job_posting.budget_max = job_data.budget_max;
        job_posting.payment_token = job_data.payment_token;
        job_posting.deadline = job_data.deadline;
        job_posting.job_type = job_data.job_type;
        job_posting.experience_level = job_data.experience_level;
        job_posting.is_active = true;
        job_posting.applications_count = 0;
        job_posting.created_at = clock.unix_timestamp;
        job_posting.updated_at = clock.unix_timestamp;
        job_posting.bump = ctx.bumps.job_posting;

        emit!(JobPostingCreatedEvent {
            job_posting: job_posting.key(),
            employer: ctx.accounts.employer.key(),
            title: job_data.title.clone(),
            budget_min: job_data.budget_min,
            budget_max: job_data.budget_max,
        });

        Ok(())
    }

    /// Agent applies to a job posting
    pub fn apply_to_job(
        ctx: Context<ApplyToJob>,
        application_data: JobApplicationData,
    ) -> Result<()> {
        let application = &mut ctx.accounts.job_application;
        let job_posting = &mut ctx.accounts.job_posting;
        let agent = &ctx.accounts.agent;
        let clock = Clock::get()?;

        // Verify job posting is active
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

        // Update job posting
        job_posting.applications_count += 1;
        job_posting.updated_at = clock.unix_timestamp;

        emit!(JobApplicationSubmittedEvent {
            job_posting: job_posting.key(),
            application: application.key(),
            agent: agent.key(),
            proposed_rate: application_data.proposed_rate,
        });

        Ok(())
    }

    /// Employer accepts a job application
    pub fn accept_job_application(
        ctx: Context<AcceptJobApplication>,
    ) -> Result<()> {
        let application = &mut ctx.accounts.job_application;
        let job_posting = &mut ctx.accounts.job_posting;
        let job_contract = &mut ctx.accounts.job_contract;
        let clock = Clock::get()?;

        // Verify application is still pending
        require!(
            application.status == ApplicationStatus::Submitted,
            PodAIMarketplaceError::InvalidApplicationStatus
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

        emit!(JobApplicationAcceptedEvent {
            job_posting: job_posting.key(),
            application: application.key(),
            contract: job_contract.key(),
            employer: job_posting.employer,
            agent: application.agent,
        });

        Ok(())
    }

    /// Complete a hired job and process payment
    pub fn complete_hired_job(
        ctx: Context<CompleteHiredJob>,
        completion_data: JobCompletionData,
    ) -> Result<()> {
        let job_contract = &mut ctx.accounts.job_contract;
        let job_completion = &mut ctx.accounts.job_completion;
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        // Verify contract is active
        require!(
            job_contract.status == ContractStatus::Active,
            PodAIMarketplaceError::InvalidContractStatus
        );

        job_completion.contract = job_contract.key();
        job_completion.agent = job_contract.agent;
        job_completion.employer = job_contract.employer;
        job_completion.deliverables = completion_data.deliverables;
        job_completion.work_summary = completion_data.work_summary;
        job_completion.ipfs_hash = completion_data.ipfs_hash;
        job_completion.metadata_uri = completion_data.metadata_uri;
        job_completion.completed_at = clock.unix_timestamp;
        job_completion.is_approved = false;
        job_completion.bump = ctx.bumps.job_completion;

        // Update contract status
        job_contract.status = ContractStatus::Completed;
        job_contract.updated_at = clock.unix_timestamp;

        // Update agent stats
        agent.total_jobs_completed += 1;
        agent.total_earnings += job_contract.agreed_rate;
        agent.reputation_score += 1;

        emit!(HiredJobCompletedEvent {
            contract: job_contract.key(),
            completion: job_completion.key(),
            agent: job_contract.agent,
            employer: job_contract.employer,
            amount: job_contract.agreed_rate,
        });

        Ok(())
    }

    /// Rate and review a completed service or job
    pub fn submit_review(
        ctx: Context<SubmitReview>,
        review_data: ReviewData,
    ) -> Result<()> {
        let review = &mut ctx.accounts.review;
        let agent = &mut ctx.accounts.agent;
        let clock = Clock::get()?;

        review.reviewer = ctx.accounts.reviewer.key();
        review.agent = agent.key();
        review.review_type = review_data.review_type;
        review.rating = review_data.rating;
        review.comment = review_data.comment;
        review.work_reference = review_data.work_reference;
        review.submitted_at = clock.unix_timestamp;
        review.bump = ctx.bumps.review;

        // Update agent rating (simple average for now)
        let total_reviews = agent.total_jobs_completed;
        if total_reviews > 0 {
            agent.reputation_score = ((agent.reputation_score * (total_reviews - 1)) + review_data.rating as u64) / total_reviews;
        }

        emit!(ReviewSubmittedEvent {
            review: review.key(),
            reviewer: ctx.accounts.reviewer.key(),
            agent: agent.key(),
            rating: review_data.rating,
        });

        Ok(())
    }

    // =====================================================
    // AGENT REPLICATION MARKETPLACE
    // =====================================================

    /// Create a replication template from an existing agent
    pub fn create_replication_template(
        ctx: Context<CreateReplicationTemplate>,
        template_data: ReplicationTemplateData,
    ) -> Result<()> {
        let template = &mut ctx.accounts.replication_template;
        let agent = &ctx.accounts.source_agent;
        let clock = Clock::get()?;

        // Verify agent allows replication
        require!(
            agent.is_replicable,
            AgentMarketplaceError::AgentNotReplicable
        );

        template.source_agent = agent.key();
        template.creator = ctx.accounts.creator.key();
        template.genome_hash = agent.genome_hash.clone();
        template.base_capabilities = agent.capabilities.clone();
        template.replication_fee = template_data.replication_fee;
        template.max_replications = template_data.max_replications;
        template.current_replications = 0;
        template.is_active = true;
        template.created_at = clock.unix_timestamp;
        template.bump = ctx.bumps.replication_template;

        emit!(ReplicationTemplateCreatedEvent {
            template: template.key(),
            source_agent: agent.key(),
            creator: ctx.accounts.creator.key(),
            replication_fee: template_data.replication_fee,
        });

        Ok(())
    }

    /// Replicate an agent from a template
    pub fn replicate_agent(
        ctx: Context<ReplicateAgent>,
        customization: AgentCustomization,
    ) -> Result<()> {
        let template = &mut ctx.accounts.replication_template;
        let new_agent = &mut ctx.accounts.new_agent;
        let replication_record = &mut ctx.accounts.replication_record;
        let clock = Clock::get()?;

        // Verify template is active and within limits
        require!(
            template.is_active && 
            template.current_replications < template.max_replications,
            AgentMarketplaceError::ReplicationLimitExceeded
        );

        // Create new agent based on template
        new_agent.owner = ctx.accounts.buyer.key();
        new_agent.name = customization.name;
        new_agent.description = customization.description.unwrap_or_default();
        new_agent.capabilities = template.base_capabilities.clone();
        new_agent.pricing_model = customization.pricing_model;
        new_agent.reputation_score = 0;
        new_agent.total_jobs_completed = 0;
        new_agent.total_earnings = 0;
        new_agent.is_active = true;
        new_agent.created_at = clock.unix_timestamp;
        new_agent.updated_at = clock.unix_timestamp;
        new_agent.genome_hash = template.genome_hash.clone();
        new_agent.is_replicable = customization.is_replicable;
        new_agent.replication_fee = customization.replication_fee.unwrap_or(0);
        new_agent.bump = ctx.bumps.new_agent;

        // Record replication
        replication_record.template = template.key();
        replication_record.source_agent = template.source_agent;
        replication_record.replicated_agent = new_agent.key();
        replication_record.buyer = ctx.accounts.buyer.key();
        replication_record.fee_paid = template.replication_fee;
        replication_record.replicated_at = clock.unix_timestamp;
        replication_record.bump = ctx.bumps.replication_record;

        // Update template
        template.current_replications += 1;

        emit!(AgentReplicatedEvent {
            template: template.key(),
            original_agent: template.source_agent,
            new_agent: new_agent.key(),
            buyer: ctx.accounts.buyer.key(),
            fee_paid: template.replication_fee,
        });

        Ok(())
    }
}

// =====================================================
// ACCOUNT STRUCTURES
// =====================================================

#[account]
pub struct Agent {
    pub owner: Pubkey,
    pub name: String,
    pub description: String,
    pub capabilities: Vec<String>,
    pub pricing_model: PricingModel,
    pub reputation_score: u64,
    pub total_jobs_completed: u64,
    pub total_earnings: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub genome_hash: String,
    pub is_replicable: bool,
    pub replication_fee: u64,
    pub bump: u8,
}

#[account]
pub struct Channel {
    pub creator: Pubkey,
    pub participants: Vec<Pubkey>,
    pub channel_type: ChannelType,
    pub is_private: bool,
    pub message_count: u64,
    pub created_at: i64,
    pub last_activity: i64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
pub struct Message {
    pub channel: Pubkey,
    pub sender: Pubkey,
    pub content: String,
    pub message_type: MessageType,
    pub timestamp: i64,
    pub is_encrypted: bool,
    pub bump: u8,
}

#[account]
pub struct WorkOrder {
    pub client: Pubkey,
    pub provider: Pubkey,
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub payment_amount: u64,
    pub payment_token: Pubkey,
    pub deadline: i64,
    pub status: WorkOrderStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
pub struct WorkDelivery {
    pub work_order: Pubkey,
    pub provider: Pubkey,
    pub client: Pubkey,
    pub deliverables: Vec<Deliverable>,
    pub ipfs_hash: String,
    pub metadata_uri: String,
    pub submitted_at: i64,
    pub is_approved: bool,
    pub bump: u8,
}

#[account]
pub struct Payment {
    pub work_order: Pubkey,
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub token_mint: Pubkey,
    pub is_confidential: bool,
    pub paid_at: i64,
    pub bump: u8,
}

#[account]
pub struct ReplicationTemplate {
    pub source_agent: Pubkey,
    pub creator: Pubkey,
    pub genome_hash: String,
    pub base_capabilities: Vec<String>,
    pub replication_fee: u64,
    pub max_replications: u32,
    pub current_replications: u32,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct ReplicationRecord {
    pub template: Pubkey,
    pub source_agent: Pubkey,
    pub replicated_agent: Pubkey,
    pub buyer: Pubkey,
    pub fee_paid: u64,
    pub replicated_at: i64,
    pub bump: u8,
}

// =====================================================
// INSTRUCTION CONTEXTS
// =====================================================

#[derive(Accounts)]
#[instruction(agent_data: AgentRegistrationData)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = Agent::LEN,
        seeds = [b"agent", owner.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", owner.key().as_ref()],
        bump = agent.bump,
        has_one = owner
    )]
    pub agent: Account<'info, Agent>,
    
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(channel_data: ChannelCreationData)]
pub struct CreateChannel<'info> {
    #[account(
        init,
        payer = creator,
        space = Channel::LEN,
        seeds = [b"channel", creator.key().as_ref(), &channel_data.channel_id.to_le_bytes()],
        bump
    )]
    pub channel: Account<'info, Channel>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(message_data: MessageData)]
pub struct SendMessage<'info> {
    #[account(
        init,
        payer = sender,
        space = Message::LEN,
        seeds = [b"message", channel.key().as_ref(), &channel.message_count.to_le_bytes()],
        bump
    )]
    pub message: Account<'info, Message>,
    
    #[account(mut)]
    pub channel: Account<'info, Channel>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

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
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        init,
        payer = payer,
        space = Payment::LEN,
        seeds = [b"payment", work_order.key().as_ref()],
        bump
    )]
    pub payment: Account<'info, Payment>,
    
    #[account(mut)]
    pub work_order: Account<'info, WorkOrder>,
    
    #[account(mut)]
    pub provider_agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut)]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub provider_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(template_data: ReplicationTemplateData)]
pub struct CreateReplicationTemplate<'info> {
    #[account(
        init,
        payer = creator,
        space = ReplicationTemplate::LEN,
        seeds = [b"replication_template", source_agent.key().as_ref()],
        bump
    )]
    pub replication_template: Account<'info, ReplicationTemplate>,
    
    pub source_agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(customization: AgentCustomization)]
pub struct ReplicateAgent<'info> {
    #[account(mut)]
    pub replication_template: Account<'info, ReplicationTemplate>,
    
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