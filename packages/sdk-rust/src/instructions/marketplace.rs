use std::sync::Arc;

use async_trait::async_trait;
use borsh::{BorshSerialize, BorshDeserialize};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    system_program,
};
use tracing::{debug, instrument};

use crate::{
    client::PodAIClient,
    client::transaction_factory::{TransactionFactory, TransactionResult},
    errors::{PodAIError, PodAIResult},
    instructions::{ComputeUnitEstimator, InstructionBuilder},
    types::marketplace::{ServiceListing, WorkOrder, JobPosting},
    utils::{find_service_listing_pda, find_work_order_pda, find_job_posting_pda},
    impl_instruction_builder_basics,
};

// Instruction discriminators for marketplace operations
const CREATE_SERVICE_LISTING_DISCRIMINATOR: [u8; 8] = [246, 28, 6, 87, 251, 45, 50, 42];
const PURCHASE_SERVICE_DISCRIMINATOR: [u8; 8] = [71, 134, 205, 242, 68, 61, 11, 213];
const CREATE_WORK_ORDER_DISCRIMINATOR: [u8; 8] = [73, 51, 216, 99, 250, 243, 243, 152];
const SUBMIT_WORK_DELIVERY_DISCRIMINATOR: [u8; 8] = [196, 126, 161, 18, 229, 194, 162, 204];
const CREATE_JOB_POSTING_DISCRIMINATOR: [u8; 8] = [233, 133, 46, 220, 224, 201, 30, 114];

// Instruction data structures
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct CreateServiceListingInstructionData {
    pub title: String,
    pub description: String,
    pub price: u64,
    pub delivery_time: i64,
    pub category: String,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PurchaseServiceInstructionData {
    pub listing_id: u64,
    pub payment_amount: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct CreateWorkOrderInstructionData {
    pub title: String,
    pub description: String,
    pub budget: u64,
    pub deadline: i64,
    pub requirements: Vec<String>,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct SubmitWorkDeliveryInstructionData {
    pub deliverables: Vec<String>,
    pub notes: String,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct CreateJobPostingInstructionData {
    pub title: String,
    pub description: String,
    pub budget: u64,
    pub deadline: i64,
    pub required_skills: Vec<String>,
}

/// Result of service listing creation
#[derive(Debug, Clone)]
pub struct ServiceListingResult {
    pub signature: solana_sdk::signature::Signature,
    pub listing_pda: Pubkey,
    pub listing_id: u64,
    pub transaction_result: TransactionResult,
}

/// Builder for creating a service listing
pub struct CreateServiceListingBuilder {
    client: Arc<PodAIClient>,
    signer: Option<Keypair>,
    title: Option<String>,
    description: Option<String>,
    price: Option<u64>,
    delivery_time: Option<i64>,
    category: Option<String>,
    transaction_factory: Option<TransactionFactory>,
}

impl CreateServiceListingBuilder {
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            signer: None,
            title: None,
            description: None,
            price: None,
            delivery_time: None,
            category: None,
            transaction_factory: None,
        }
    }

    pub fn signer(mut self, signer: Keypair) -> Self {
        self.signer = Some(signer);
        self
    }

    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    pub fn description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }

    pub fn price(mut self, price: u64) -> Self {
        self.price = Some(price);
        self
    }

    pub fn delivery_time(mut self, delivery_time: i64) -> Self {
        self.delivery_time = Some(delivery_time);
        self
    }

    pub fn category(mut self, category: impl Into<String>) -> Self {
        self.category = Some(category.into());
        self
    }

    pub fn transaction_factory(mut self, factory: TransactionFactory) -> Self {
        self.transaction_factory = Some(factory);
        self
    }

    fn validate_params(&self) -> PodAIResult<()> {
        if self.signer.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "signer".to_string(),
                reason: "Signer is required".to_string(),
            });
        }

        if self.title.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "title".to_string(),
                reason: "Title is required".to_string(),
            });
        }

        if self.price.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "price".to_string(),
                reason: "Price is required".to_string(),
            });
        }

        Ok(())
    }

    #[instrument(skip(self))]
    pub async fn execute(self) -> PodAIResult<ServiceListingResult> {
        debug!("Executing service listing creation");
        
        self.validate_params()?;

        let signer = self.signer.unwrap();
        let title = self.title.unwrap();
        let description = self.description.unwrap_or_default();
        let price = self.price.unwrap();
        let delivery_time = self.delivery_time.unwrap_or(7 * 24 * 60 * 60); // Default 7 days
        let category = self.category.unwrap_or_else(|| "general".to_string());

        let factory = self.transaction_factory.unwrap_or_else(|| {
            TransactionFactory::new(self.client.clone())
        });

        // Generate a unique listing ID (in production, this would come from the program)
        let listing_id = chrono::Utc::now().timestamp() as u64;
        let listing_pda = find_service_listing_pda(&signer.pubkey(), listing_id);

        let instruction_builder = CreateServiceListingInstructionBuilder {
            client: self.client.clone(),
            signer: signer.clone(),
            title,
            description,
            price,
            delivery_time,
            category,
            listing_id,
        };

        let instructions = instruction_builder.build().await?;
        let signers = vec![&signer];

        let transaction_result = factory
            .execute_transaction(instructions, &signers, Some(&signer.pubkey()))
            .await?;

        Ok(ServiceListingResult {
            signature: transaction_result.signature,
            listing_pda,
            listing_id,
            transaction_result,
        })
    }
}

/// Internal instruction builder for service listing creation
struct CreateServiceListingInstructionBuilder {
    client: Arc<PodAIClient>,
    signer: Keypair,
    title: String,
    description: String,
    price: u64,
    delivery_time: i64,
    category: String,
    listing_id: u64,
}

#[async_trait]
impl InstructionBuilder for CreateServiceListingInstructionBuilder {
    async fn build(&self) -> PodAIResult<Vec<Instruction>> {
        let listing_pda = find_service_listing_pda(&self.signer.pubkey(), self.listing_id);
        
        let instruction = build_create_service_listing_instruction(
            &self.signer.pubkey(),
            &listing_pda,
            &self.title,
            &self.description,
            self.price,
            self.delivery_time,
            &self.category,
        )?;

        Ok(vec![instruction])
    }

    fn payer(&self) -> Pubkey {
        self.signer.pubkey()
    }

    fn signers(&self) -> Vec<&Keypair> {
        vec![&self.signer]
    }

    fn instruction_type(&self) -> &'static str {
        "create_service_listing"
    }

    fn validate(&self) -> PodAIResult<()> {
        if self.title.len() > 100 {
            return Err(PodAIError::ValidationFailed {
                field: "title".to_string(),
                reason: "Title too long (max 100 chars)".to_string(),
            });
        }
        if self.description.len() > 500 {
            return Err(PodAIError::ValidationFailed {
                field: "description".to_string(),
                reason: "Description too long (max 500 chars)".to_string(),
            });
        }
        Ok(())
    }
}

impl ComputeUnitEstimator for CreateServiceListingInstructionBuilder {
    fn estimate_compute_units(&self) -> u32 {
        // Service listing creation with string allocations
        80_000
    }
}

/// Result of work order creation
#[derive(Debug, Clone)]
pub struct WorkOrderResult {
    pub signature: solana_sdk::signature::Signature,
    pub work_order_pda: Pubkey,
    pub order_id: u64,
    pub transaction_result: TransactionResult,
}

/// Builder for creating a work order
pub struct CreateWorkOrderBuilder {
    client: Arc<PodAIClient>,
    signer: Option<Keypair>,
    provider: Option<Pubkey>,
    title: Option<String>,
    description: Option<String>,
    budget: Option<u64>,
    deadline: Option<i64>,
    requirements: Vec<String>,
    transaction_factory: Option<TransactionFactory>,
}

impl CreateWorkOrderBuilder {
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            signer: None,
            provider: None,
            title: None,
            description: None,
            budget: None,
            deadline: None,
            requirements: Vec::new(),
            transaction_factory: None,
        }
    }

    pub fn signer(mut self, signer: Keypair) -> Self {
        self.signer = Some(signer);
        self
    }

    pub fn provider(mut self, provider: Pubkey) -> Self {
        self.provider = Some(provider);
        self
    }

    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    pub fn description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }

    pub fn budget(mut self, budget: u64) -> Self {
        self.budget = Some(budget);
        self
    }

    pub fn deadline(mut self, deadline: i64) -> Self {
        self.deadline = Some(deadline);
        self
    }

    pub fn add_requirement(mut self, requirement: impl Into<String>) -> Self {
        self.requirements.push(requirement.into());
        self
    }

    pub fn requirements(mut self, requirements: Vec<String>) -> Self {
        self.requirements = requirements;
        self
    }

    pub fn transaction_factory(mut self, factory: TransactionFactory) -> Self {
        self.transaction_factory = Some(factory);
        self
    }

    #[instrument(skip(self))]
    pub async fn execute(self) -> PodAIResult<WorkOrderResult> {
        debug!("Executing work order creation");

        let signer = self.signer.ok_or_else(|| PodAIError::InvalidInput {
            field: "signer".to_string(),
            reason: "Signer is required".to_string(),
        })?;

        let provider = self.provider.ok_or_else(|| PodAIError::InvalidInput {
            field: "provider".to_string(),
            reason: "Provider is required".to_string(),
        })?;

        let title = self.title.unwrap_or_else(|| "Work Order".to_string());
        let description = self.description.unwrap_or_default();
        let budget = self.budget.unwrap_or(0);
        let deadline = self.deadline.unwrap_or_else(|| {
            chrono::Utc::now().timestamp() + (30 * 24 * 60 * 60) // Default 30 days
        });

        let factory = self.transaction_factory.unwrap_or_else(|| {
            TransactionFactory::new(self.client.clone())
        });

        let order_id = chrono::Utc::now().timestamp() as u64;
        let work_order_pda = find_work_order_pda(&signer.pubkey(), order_id);

        let instruction_builder = CreateWorkOrderInstructionBuilder {
            client: self.client.clone(),
            signer: signer.clone(),
            provider,
            title,
            description,
            budget,
            deadline,
            requirements: self.requirements,
            order_id,
        };

        let instructions = instruction_builder.build().await?;
        let signers = vec![&signer];

        let transaction_result = factory
            .execute_transaction(instructions, &signers, Some(&signer.pubkey()))
            .await?;

        Ok(WorkOrderResult {
            signature: transaction_result.signature,
            work_order_pda,
            order_id,
            transaction_result,
        })
    }
}

/// Internal instruction builder for work order creation
struct CreateWorkOrderInstructionBuilder {
    client: Arc<PodAIClient>,
    signer: Keypair,
    provider: Pubkey,
    title: String,
    description: String,
    budget: u64,
    deadline: i64,
    requirements: Vec<String>,
    order_id: u64,
}

#[async_trait]
impl InstructionBuilder for CreateWorkOrderInstructionBuilder {
    async fn build(&self) -> PodAIResult<Vec<Instruction>> {
        let work_order_pda = find_work_order_pda(&self.signer.pubkey(), self.order_id);
        
        let instruction = build_create_work_order_instruction(
            &self.signer.pubkey(),
            &self.provider,
            &work_order_pda,
            &self.title,
            &self.description,
            self.budget,
            self.deadline,
            &self.requirements,
        )?;

        Ok(vec![instruction])
    }

    fn payer(&self) -> Pubkey {
        self.signer.pubkey()
    }

    fn signers(&self) -> Vec<&Keypair> {
        vec![&self.signer]
    }

    fn instruction_type(&self) -> &'static str {
        "create_work_order"
    }
}

impl ComputeUnitEstimator for CreateWorkOrderInstructionBuilder {
    fn estimate_compute_units(&self) -> u32 {
        // Work order creation is more complex
        100_000
    }
}

// Helper functions to build Anchor-compatible instructions

fn build_create_service_listing_instruction(
    signer: &Pubkey,
    listing_pda: &Pubkey,
    title: &str,
    description: &str,
    price: u64,
    delivery_time: i64,
    category: &str,
) -> PodAIResult<Instruction> {
    let accounts = vec![
        AccountMeta::new(*listing_pda, false),
        AccountMeta::new(*signer, true),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&CREATE_SERVICE_LISTING_DISCRIMINATOR);
    
    let args = CreateServiceListingInstructionData {
        title: title.to_string(),
        description: description.to_string(),
        price,
        delivery_time,
        category: category.to_string(),
    };
    
    args.serialize(&mut instruction_data)
        .map_err(|e| PodAIError::SerializationError {
            message: format!("Failed to serialize create_service_listing instruction: {}", e),
        })?;
    
    Ok(Instruction {
        program_id: crate::PROGRAM_ID,
        accounts,
        data: instruction_data,
    })
}

fn build_create_work_order_instruction(
    client: &Pubkey,
    provider: &Pubkey,
    work_order_pda: &Pubkey,
    title: &str,
    description: &str,
    budget: u64,
    deadline: i64,
    requirements: &[String],
) -> PodAIResult<Instruction> {
    // Find escrow PDA
    let (escrow_pda, _) = Pubkey::find_program_address(
        &[b"escrow", work_order_pda.as_ref()],
        &crate::PROGRAM_ID,
    );

    let accounts = vec![
        AccountMeta::new(*work_order_pda, false),
        AccountMeta::new(escrow_pda, false),
        AccountMeta::new(*client, true),
        AccountMeta::new_readonly(*provider, false),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&CREATE_WORK_ORDER_DISCRIMINATOR);
    
    let args = CreateWorkOrderInstructionData {
        title: title.to_string(),
        description: description.to_string(),
        budget,
        deadline,
        requirements: requirements.to_vec(),
    };
    
    args.serialize(&mut instruction_data)
        .map_err(|e| PodAIError::SerializationError {
            message: format!("Failed to serialize create_work_order instruction: {}", e),
        })?;
    
    Ok(Instruction {
        program_id: crate::PROGRAM_ID,
        accounts,
        data: instruction_data,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_service_listing_builder() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let signer = Keypair::new();
        
        let builder = CreateServiceListingBuilder::new(client)
            .signer(signer)
            .title("AI Code Review Service")
            .description("Professional code review by AI agent")
            .price(100_000_000) // 0.1 SOL
            .category("development");
        
        assert!(builder.validate_params().is_ok());
    }

    #[tokio::test]
    async fn test_work_order_builder() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let signer = Keypair::new();
        let provider = Keypair::new().pubkey();
        
        let builder = CreateWorkOrderBuilder::new(client)
            .signer(signer)
            .provider(provider)
            .title("Build DeFi Dashboard")
            .budget(1_000_000_000) // 1 SOL
            .add_requirement("React experience")
            .add_requirement("Web3 integration");
        
        // Validation should pass
        assert!(builder.signer.is_some());
        assert!(builder.provider.is_some());
    }
}