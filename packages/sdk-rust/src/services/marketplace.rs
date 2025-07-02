//! Marketplace service for trading data products and services

use crate::client::PodAIClient;
use crate::errors::{PodAIError, PodAIResult};
use crate::types::marketplace::{DataProductAccount, ProductRequestAccount, CapabilityServiceAccount};
use crate::utils::pda::{find_data_product_pda, find_product_request_pda, find_capability_service_pda};
use crate::utils::TransactionFactory;
use solana_sdk::{
    pubkey::Pubkey, 
    signature::{Keypair, Signature, Signer},
    instruction::{AccountMeta, Instruction},
};
use serde::{Serialize, Deserialize};
use std::sync::Arc;

/// Service for managing marketplace operations
pub struct MarketplaceService {
    client: Arc<PodAIClient>,
}

impl MarketplaceService {
    /// Create a new marketplace service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Create a product request with modern transaction factory patterns
    pub async fn create_product_request_with_factory(
        &self,
        factory: &TransactionFactory,
        requester: &dyn Signer,
        target_agent: &Pubkey,
        request_type: u8,
        requirements: &str,
        budget: u64,
    ) -> PodAIResult<ProductRequestResult> {
        let (request_pda, bump) = find_product_request_pda(
            &requester.pubkey(),
            target_agent,
            request_type,
            requirements,
        );

        // Check if request already exists
        if self.client.account_exists(&request_pda).await? {
            return Err(PodAIError::marketplace("Product request already exists"));
        }

        // Create the instruction for product request creation
        let instruction = self.create_product_request_instruction(
            &requester.pubkey(),
            &request_pda,
            target_agent,
            request_type,
            requirements,
            budget,
            bump,
        )?;

        // Build and send transaction using factory
        let transaction = factory.build_transaction(vec![instruction], &requester.pubkey(), &[requester]).await?;
        let result = factory.send_transaction(&transaction).await?;

        // Create result with actual account data (simplified for now)
        let request_account = ProductRequestAccount::new(
            requester.pubkey(),
            *target_agent,
            match request_type {
                0 => crate::types::marketplace::ProductRequestType::DataProduct,
                1 => crate::types::marketplace::ProductRequestType::Service,
                _ => crate::types::marketplace::ProductRequestType::Custom,
            },
            requirements.to_string(),
            budget,
            chrono::Utc::now().timestamp(),
            0, // bump - to be filled correctly in real implementation
        )?;

        Ok(ProductRequestResult {
            signature: result.signature,
            request_pda,
            request_account,
            requester: requester.pubkey(),
            target_agent: *target_agent,
            request_type,
            requirements: requirements.to_string(),
            budget,
            timestamp: chrono::Utc::now(),
        })
    }

    /// Create a data product with factory patterns
    pub async fn create_data_product_with_factory(
        &self,
        factory: &TransactionFactory,
        creator: &dyn Signer,
        title: &str,
        content_hash: [u8; 32],
        price: u64,
    ) -> PodAIResult<DataProductResult> {
        let (product_pda, bump) = find_data_product_pda(
            &creator.pubkey(),
            &content_hash,
            title,
        );

        // Check if product already exists
        if self.client.account_exists(&product_pda).await? {
            return Err(PodAIError::marketplace("Data product already exists"));
        }

        // Create the instruction for data product creation
        let instruction = self.create_data_product_instruction(
            &creator.pubkey(),
            &product_pda,
            title,
            &content_hash,
            price,
            bump,
        )?;

        // Build and send transaction using factory
        let transaction = factory.build_transaction(vec![instruction], &creator.pubkey(), &[creator]).await?;
        let result = factory.send_transaction(&transaction).await?;

        // Create result with actual account data
        let product_account = DataProductAccount::new(
            creator.pubkey(),
            None, // request_id
            crate::types::marketplace::DataProductType::Dataset, // product_type
            title.to_string(),
            "Generated data product".to_string(), // description
            content_hash,
            "QmPlaceholder".to_string(), // ipfs_cid placeholder
            price,
            500, // royalty_percentage (5%)
            bump,
        )?;

        Ok(DataProductResult {
            signature: result.signature,
            product_pda,
            product_account,
            creator: creator.pubkey(),
            title: title.to_string(),
            content_hash,
            price,
            timestamp: chrono::Utc::now(),
        })
    }

    /// Register a capability service with factory patterns
    pub async fn register_capability_service_with_factory(
        &self,
        factory: &TransactionFactory,
        provider: &dyn Signer,
        service_type: u8,
        service_name: &str,
        rate_per_unit: u64,
    ) -> PodAIResult<CapabilityServiceResult> {
        let (service_pda, bump) = find_capability_service_pda(
            &provider.pubkey(),
            service_type,
            service_name,
        );

        // Check if service already exists
        if self.client.account_exists(&service_pda).await? {
            return Err(PodAIError::marketplace("Capability service already exists"));
        }

        // Create the instruction for capability service registration
        let instruction = self.create_capability_service_instruction(
            &provider.pubkey(),
            &service_pda,
            service_type,
            service_name,
            rate_per_unit,
            bump,
        )?;

        // Build and send transaction using factory
        let transaction = factory.build_transaction(vec![instruction], &provider.pubkey(), &[provider]).await?;
        let result = factory.send_transaction(&transaction).await?;

        // Create result with actual account data
        let service_account = CapabilityServiceAccount::new(
            provider.pubkey(),
            match service_type {
                0 => crate::types::marketplace::CapabilityServiceType::DataProcessing,
                1 => crate::types::marketplace::CapabilityServiceType::ModelTraining,
                2 => crate::types::marketplace::CapabilityServiceType::Analysis,
                3 => crate::types::marketplace::CapabilityServiceType::Consultation,
                4 => crate::types::marketplace::CapabilityServiceType::Integration,
                _ => crate::types::marketplace::CapabilityServiceType::Custom,
            },
            service_name.to_string(),
            "Professional service".to_string(), // service_description
            rate_per_unit, // base_price
            3600, // estimated_completion_time (1 hour)
            5, // max_concurrent_requests
            true, // requires_escrow
            bump,
        )?;

        Ok(CapabilityServiceResult {
            signature: result.signature,
            service_pda,
            service_account,
            provider: provider.pubkey(),
            service_type,
            service_name: service_name.to_string(),
            rate_per_unit,
            timestamp: chrono::Utc::now(),
        })
    }

    /// Create instruction for product request creation
    fn create_product_request_instruction(
        &self,
        requester: &Pubkey,
        request_pda: &Pubkey,
        target_agent: &Pubkey,
        request_type: u8,
        requirements: &str,
        budget: u64,
        bump: u8,
    ) -> PodAIResult<Instruction> {
        // Build instruction discriminator for create_product_request
        let discriminator = [142, 179, 25, 199, 84, 243, 69, 80]; // anchor discriminator

        // Serialize instruction data
        let mut instruction_data = Vec::with_capacity(8 + 1 + 32 + 1 + 4 + requirements.len() + 8 + 1);
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.push(request_type);
        instruction_data.extend_from_slice(target_agent.as_ref());
        instruction_data.extend_from_slice(&(requirements.len() as u32).to_le_bytes());
        instruction_data.extend_from_slice(requirements.as_bytes());
        instruction_data.extend_from_slice(&budget.to_le_bytes());
        instruction_data.push(bump);

        // Build account metas following Anchor patterns
        let account_metas = vec![
            AccountMeta::new(*request_pda, false),           // request_account (writable, PDA)
            AccountMeta::new(*requester, true),              // requester (writable, signer)
            AccountMeta::new_readonly(*target_agent, false), // target_agent (readonly)
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Create instruction for data product creation
    fn create_data_product_instruction(
        &self,
        creator: &Pubkey,
        product_pda: &Pubkey,
        title: &str,
        content_hash: &[u8; 32],
        price: u64,
        bump: u8,
    ) -> PodAIResult<Instruction> {
        // Build instruction discriminator for create_data_product
        let discriminator = [15, 40, 235, 178, 191, 96, 190, 12]; // anchor discriminator

        // Serialize instruction data
        let mut instruction_data = Vec::with_capacity(8 + 4 + title.len() + 32 + 8 + 1);
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.extend_from_slice(&(title.len() as u32).to_le_bytes());
        instruction_data.extend_from_slice(title.as_bytes());
        instruction_data.extend_from_slice(content_hash);
        instruction_data.extend_from_slice(&price.to_le_bytes());
        instruction_data.push(bump);

        // Build account metas following Anchor patterns
        let account_metas = vec![
            AccountMeta::new(*product_pda, false),           // product_account (writable, PDA)
            AccountMeta::new(*creator, true),                // creator (writable, signer)
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Create instruction for capability service registration
    fn create_capability_service_instruction(
        &self,
        provider: &Pubkey,
        service_pda: &Pubkey,
        service_type: u8,
        service_name: &str,
        rate_per_unit: u64,
        bump: u8,
    ) -> PodAIResult<Instruction> {
        // Build instruction discriminator for register_capability_service
        let discriminator = [135, 157, 66, 195, 2, 113, 175, 30]; // anchor discriminator

        // Serialize instruction data
        let mut instruction_data = Vec::with_capacity(8 + 1 + 4 + service_name.len() + 8 + 1);
        instruction_data.extend_from_slice(&discriminator);
        instruction_data.push(service_type);
        instruction_data.extend_from_slice(&(service_name.len() as u32).to_le_bytes());
        instruction_data.extend_from_slice(service_name.as_bytes());
        instruction_data.extend_from_slice(&rate_per_unit.to_le_bytes());
        instruction_data.push(bump);

        // Build account metas following Anchor patterns
        let account_metas = vec![
            AccountMeta::new(*service_pda, false),           // service_account (writable, PDA)
            AccountMeta::new(*provider, true),               // provider (writable, signer)
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false), // system_program
        ];

        Ok(Instruction {
            program_id: self.client.program_id(),
            accounts: account_metas,
            data: instruction_data,
        })
    }

    /// Legacy create product request method (for backwards compatibility)
    pub async fn create_product_request(
        &self,
        requester_keypair: &Keypair,
        target_agent: &Pubkey,
        request_type: u8,
        requirements: &str,
        budget: u64,
    ) -> PodAIResult<ProductRequestResult> {
        // Use factory pattern with default config
        let factory = TransactionFactory::new(&self.client);

        self.create_product_request_with_factory(
            &factory,
            requester_keypair,
            target_agent,
            request_type,
            requirements,
            budget,
        ).await
    }

    /// Legacy create data product method (for backwards compatibility)
    pub async fn create_data_product(
        &self,
        creator_keypair: &Keypair,
        title: &str,
        content_hash: [u8; 32],
        price: u64,
    ) -> PodAIResult<DataProductResult> {
        // Use factory pattern with default config
        let factory = TransactionFactory::new(&self.client);

        self.create_data_product_with_factory(
            &factory,
            creator_keypair,
            title,
            content_hash,
            price,
        ).await
    }

    /// Legacy register capability service method (for backwards compatibility)
    pub async fn register_capability_service(
        &self,
        provider_keypair: &Keypair,
        service_type: u8,
        service_name: &str,
        rate_per_unit: u64,
    ) -> PodAIResult<CapabilityServiceResult> {
        // Use factory pattern with default config
        let factory = TransactionFactory::new(&self.client);

        self.register_capability_service_with_factory(
            &factory,
            provider_keypair,
            service_type,
            service_name,
            rate_per_unit,
        ).await
    }
}

/// Enhanced result of product request creation with full transaction info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductRequestResult {
    /// Transaction signature
    pub signature: Signature,
    /// The request PDA
    pub request_pda: Pubkey,
    /// The request account
    pub request_account: ProductRequestAccount,
    /// Requester public key
    pub requester: Pubkey,
    /// Target agent public key
    pub target_agent: Pubkey,
    /// Request type
    pub request_type: u8,
    /// Requirements description
    pub requirements: String,
    /// Budget for the request
    pub budget: u64,
    /// Transaction timestamp
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl ProductRequestResult {
    /// Get the request ID (PDA)
    pub fn request_id(&self) -> Pubkey {
        self.request_pda
    }

    /// Check if request is active
    pub fn is_active(&self) -> bool {
        // Implementation would check on-chain status
        true
    }
}

/// Enhanced result of data product creation with full transaction info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataProductResult {
    /// Transaction signature
    pub signature: Signature,
    /// The product PDA
    pub product_pda: Pubkey,
    /// The product account
    pub product_account: DataProductAccount,
    /// Creator public key
    pub creator: Pubkey,
    /// Product title
    pub title: String,
    /// Content hash
    pub content_hash: [u8; 32],
    /// Product price
    pub price: u64,
    /// Transaction timestamp
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl DataProductResult {
    /// Get the product ID (PDA)
    pub fn product_id(&self) -> Pubkey {
        self.product_pda
    }

    /// Check if product is available
    pub fn is_available(&self) -> bool {
        // Implementation would check on-chain status
        true
    }
}

/// Enhanced result of capability service registration with full transaction info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityServiceResult {
    /// Transaction signature
    pub signature: Signature,
    /// The service PDA
    pub service_pda: Pubkey,
    /// The service account
    pub service_account: CapabilityServiceAccount,
    /// Provider public key
    pub provider: Pubkey,
    /// Service type
    pub service_type: u8,
    /// Service name
    pub service_name: String,
    /// Rate per unit
    pub rate_per_unit: u64,
    /// Transaction timestamp
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl CapabilityServiceResult {
    /// Get the service ID (PDA)
    pub fn service_id(&self) -> Pubkey {
        self.service_pda
    }

    /// Check if service is active
    pub fn is_active(&self) -> bool {
        // Implementation would check on-chain status
        true
    }
}


