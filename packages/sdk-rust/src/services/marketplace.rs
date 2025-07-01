//! Marketplace service for trading data products and services

use crate::client::PodAIClient;
use crate::errors::{PodAIError, PodAIResult};
use crate::types::marketplace::{DataProductAccount, ProductRequestAccount, CapabilityServiceAccount};
use crate::utils::pda::{find_data_product_pda, find_product_request_pda, find_capability_service_pda};
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::sync::Arc;

/// Service for managing marketplace operations
#[derive(Debug, Clone)]
pub struct MarketplaceService {
    client: Arc<PodAIClient>,
}

impl MarketplaceService {
    /// Create a new marketplace service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Create a product request
    pub async fn create_product_request(
        &self,
        requester_keypair: &Keypair,
        target_agent: &Pubkey,
        request_type: u8,
        requirements: &str,
        budget: u64,
    ) -> PodAIResult<ProductRequestResult> {
        let (request_pda, bump) = find_product_request_pda(
            &requester_keypair.pubkey(),
            target_agent,
            request_type,
            requirements,
        );

        // Check if request already exists
        if self.client.account_exists(&request_pda).await? {
            return Err(PodAIError::marketplace("Product request already exists"));
        }

        // Create product request account
        let request_account = ProductRequestAccount::new(
            requester_keypair.pubkey(),
            *target_agent,
            request_type,
            requirements.to_string(),
            budget,
            bump,
        )?;

        // TODO: Implement actual transaction creation and sending
        Ok(ProductRequestResult {
            request_pda,
            request_account,
        })
    }

    /// Create a data product
    pub async fn create_data_product(
        &self,
        creator_keypair: &Keypair,
        title: &str,
        content_hash: [u8; 32],
        price: u64,
    ) -> PodAIResult<DataProductResult> {
        let (product_pda, bump) = find_data_product_pda(
            &creator_keypair.pubkey(),
            &content_hash,
            title,
        );

        // Check if product already exists
        if self.client.account_exists(&product_pda).await? {
            return Err(PodAIError::marketplace("Data product already exists"));
        }

        // Create data product account
        let product_account = DataProductAccount::new(
            creator_keypair.pubkey(),
            title.to_string(),
            content_hash,
            price,
            bump,
        )?;

        // TODO: Implement actual transaction creation and sending
        Ok(DataProductResult {
            product_pda,
            product_account,
        })
    }

    /// Register a capability service
    pub async fn register_capability_service(
        &self,
        provider_keypair: &Keypair,
        service_type: u8,
        service_name: &str,
        rate_per_unit: u64,
    ) -> PodAIResult<CapabilityServiceResult> {
        let (service_pda, bump) = find_capability_service_pda(
            &provider_keypair.pubkey(),
            service_type,
            service_name,
        );

        // Check if service already exists
        if self.client.account_exists(&service_pda).await? {
            return Err(PodAIError::marketplace("Capability service already exists"));
        }

        // Create capability service account
        let service_account = CapabilityServiceAccount::new(
            provider_keypair.pubkey(),
            service_type,
            service_name.to_string(),
            rate_per_unit,
            bump,
        )?;

        // TODO: Implement actual transaction creation and sending
        Ok(CapabilityServiceResult {
            service_pda,
            service_account,
        })
    }
}

/// Result of product request creation
#[derive(Debug, Clone)]
pub struct ProductRequestResult {
    /// The request PDA
    pub request_pda: Pubkey,
    /// The request account
    pub request_account: ProductRequestAccount,
}

/// Result of data product creation
#[derive(Debug, Clone)]
pub struct DataProductResult {
    /// The product PDA
    pub product_pda: Pubkey,
    /// The product account
    pub product_account: DataProductAccount,
}

/// Result of capability service registration
#[derive(Debug, Clone)]
pub struct CapabilityServiceResult {
    /// The service PDA
    pub service_pda: Pubkey,
    /// The service account
    pub service_account: CapabilityServiceAccount,
}
