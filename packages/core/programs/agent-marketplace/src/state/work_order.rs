/*!
 * Work Order State Module
 * 
 * Contains work order related state structures.
 */

use anchor_lang::prelude::*;
use super::{MAX_GENERAL_STRING_LENGTH, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_REQUIREMENTS_ITEMS, PodAIMarketplaceError};

// PDA Seeds
pub const WORK_ORDER_SEED: &[u8] = b"work_order";
pub const WORK_DELIVERY_SEED: &[u8] = b"work_delivery";

// Constants
pub const MAX_DELIVERABLES: usize = 5;
pub const MAX_IPFS_HASH_LENGTH: usize = 64;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum WorkOrderStatus {
    Created,
    Open,
    Submitted,
    InProgress,
    Approved,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Deliverable {
    Code,
    Document,
    Design,
    Analysis,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct WorkOrderData {
    pub order_id: u64,
    pub provider: Pubkey,
    pub title: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub payment_amount: u64,
    pub payment_token: Pubkey,
    pub deadline: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct WorkDeliveryData {
    pub deliverables: Vec<Deliverable>,
    pub ipfs_hash: String,
    pub metadata_uri: String,
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
    pub status: WorkOrderStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub deadline: i64,
    pub delivered_at: Option<i64>,
    pub bump: u8,
}

#[account]
pub struct WorkDelivery {
    pub work_order: Pubkey,
    pub provider: Pubkey,
    pub deliverables: Vec<Deliverable>,
    pub ipfs_hash: String,
    pub metadata_uri: String,
    pub submitted_at: i64,
    pub bump: u8,
}

impl WorkOrder {
    pub const LEN: usize = 8 + // discriminator
        32 + // client
        32 + // provider
        4 + MAX_TITLE_LENGTH + // title
        4 + MAX_DESCRIPTION_LENGTH + // description
        4 + (MAX_REQUIREMENTS_ITEMS * (4 + MAX_GENERAL_STRING_LENGTH)) + // requirements
        8 + // payment_amount
        32 + // payment_token
        1 + // status
        8 + // created_at
        8 + // updated_at
        8 + // deadline
        1 + 8 + // delivered_at (Option<i64>)
        1; // bump

    pub fn initialize(
        &mut self,
        client: Pubkey,
        provider: Pubkey,
        title: String,
        description: String,
        requirements: Vec<String>,
        payment_amount: u64,
        payment_token: Pubkey,
        deadline: i64,
        bump: u8,
    ) -> Result<()> {
        require!(title.len() <= MAX_TITLE_LENGTH, PodAIMarketplaceError::TitleTooLong);
        require!(description.len() <= MAX_DESCRIPTION_LENGTH, PodAIMarketplaceError::DescriptionTooLong);
        require!(requirements.len() <= MAX_REQUIREMENTS_ITEMS, PodAIMarketplaceError::TooManyRequirements);
        
        for req in &requirements {
            require!(req.len() <= MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError::RequirementTooLong);
        }
        
        let clock = Clock::get()?;
        require!(deadline > clock.unix_timestamp, PodAIMarketplaceError::InvalidDeadline);
        require!(payment_amount > 0, PodAIMarketplaceError::InvalidPaymentAmount);
        
        self.client = client;
        self.provider = provider;
        self.title = title;
        self.description = description;
        self.requirements = requirements;
        self.payment_amount = payment_amount;
        self.payment_token = payment_token;
        self.status = WorkOrderStatus::Created;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.deadline = deadline;
        self.delivered_at = None;
        self.bump = bump;
        
        Ok(())
    }

    pub fn open(&mut self) -> Result<()> {
        require!(self.status == WorkOrderStatus::Created, PodAIMarketplaceError::InvalidWorkOrderStatus);
        
        self.status = WorkOrderStatus::Open;
        self.updated_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    pub fn submit(&mut self) -> Result<()> {
        require!(self.status == WorkOrderStatus::Open, PodAIMarketplaceError::InvalidWorkOrderStatus);
        
        self.status = WorkOrderStatus::Submitted;
        self.updated_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    pub fn start(&mut self) -> Result<()> {
        require!(self.status == WorkOrderStatus::Submitted, PodAIMarketplaceError::InvalidWorkOrderStatus);
        
        self.status = WorkOrderStatus::InProgress;
        self.updated_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    pub fn approve(&mut self) -> Result<()> {
        require!(self.status == WorkOrderStatus::InProgress, PodAIMarketplaceError::InvalidWorkOrderStatus);
        
        let clock = Clock::get()?;
        self.status = WorkOrderStatus::Approved;
        self.updated_at = clock.unix_timestamp;
        self.delivered_at = Some(clock.unix_timestamp);
        
        Ok(())
    }

    pub fn complete(&mut self) -> Result<()> {
        require!(self.status == WorkOrderStatus::Approved, PodAIMarketplaceError::InvalidWorkOrderStatus);
        
        self.status = WorkOrderStatus::Completed;
        self.updated_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    pub fn cancel(&mut self) -> Result<()> {
        require!(
            matches!(self.status, WorkOrderStatus::Created | WorkOrderStatus::Open | WorkOrderStatus::Submitted),
            PodAIMarketplaceError::InvalidWorkOrderStatus
        );
        
        self.status = WorkOrderStatus::Cancelled;
        self.updated_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }
}

impl WorkDelivery {
    pub const LEN: usize = 8 + // discriminator
        32 + // work_order
        32 + // provider
        4 + (MAX_DELIVERABLES * 1) + // deliverables
        4 + MAX_IPFS_HASH_LENGTH + // ipfs_hash
        4 + MAX_GENERAL_STRING_LENGTH + // metadata_uri
        8 + // submitted_at
        1; // bump

    pub fn initialize(
        &mut self,
        work_order: Pubkey,
        provider: Pubkey,
        deliverables: Vec<Deliverable>,
        ipfs_hash: String,
        metadata_uri: String,
        bump: u8,
    ) -> Result<()> {
        require!(deliverables.len() > 0, PodAIMarketplaceError::NoDeliverables);
        require!(deliverables.len() <= MAX_DELIVERABLES, PodAIMarketplaceError::TooManyDeliverables);
        require!(ipfs_hash.len() <= MAX_IPFS_HASH_LENGTH, PodAIMarketplaceError::IpfsHashTooLong);
        require!(metadata_uri.len() <= MAX_GENERAL_STRING_LENGTH, PodAIMarketplaceError::MetadataUriTooLong);
        
        self.work_order = work_order;
        self.provider = provider;
        self.deliverables = deliverables;
        self.ipfs_hash = ipfs_hash;
        self.metadata_uri = metadata_uri;
        self.submitted_at = Clock::get()?.unix_timestamp;
        self.bump = bump;
        
        Ok(())
    }
}