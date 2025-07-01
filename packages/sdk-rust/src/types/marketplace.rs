//! Marketplace account types and related functionality

use super::time_utils::{datetime_to_timestamp, timestamp_to_datetime};
use super::AccountData;
use borsh::{BorshDeserialize, BorshSerialize};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;

/// Maximum length for product requirements description
pub const MAX_REQUIREMENTS_DESCRIPTION_LENGTH: usize = 500;

/// Maximum length for product title
pub const MAX_PRODUCT_TITLE_LENGTH: usize = 200;

/// Maximum length for product description
pub const MAX_PRODUCT_DESCRIPTION_LENGTH: usize = 500;

/// Maximum length for IPFS CID
pub const MAX_IPFS_CID_LENGTH: usize = 100;

/// Maximum length for service name
pub const MAX_SERVICE_NAME_LENGTH: usize = 200;

/// Maximum length for service description
pub const MAX_SERVICE_DESCRIPTION_LENGTH: usize = 500;

/// Maximum royalty percentage (10000 = 100%)
pub const MAX_ROYALTY_PERCENTAGE: u16 = 10000;

/// Types of product requests agents can make
#[derive(Debug, Clone, Copy, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
#[repr(u8)]
pub enum ProductRequestType {
    /// Request for data analysis or insights
    DataAnalysis = 0,
    /// Request for trading signals or strategies
    TradingSignals = 1,
    /// Request for custom computation or algorithms
    Computation = 2,
    /// Request for AI model training or inference
    AiService = 3,
    /// Request for content creation (text, images, etc.)
    ContentCreation = 4,
    /// Request for research and information gathering
    Research = 5,
    /// Request for automated task execution
    Automation = 6,
    /// Custom service type defined by provider
    Custom = 7,
}

impl ProductRequestType {
    /// Get all available request types
    pub fn all() -> Vec<Self> {
        vec![
            Self::DataAnalysis,
            Self::TradingSignals,
            Self::Computation,
            Self::AiService,
            Self::ContentCreation,
            Self::Research,
            Self::Automation,
            Self::Custom,
        ]
    }

    /// Get the request type as a string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::DataAnalysis => "DataAnalysis",
            Self::TradingSignals => "TradingSignals",
            Self::Computation => "Computation",
            Self::AiService => "AiService",
            Self::ContentCreation => "ContentCreation",
            Self::Research => "Research",
            Self::Automation => "Automation",
            Self::Custom => "Custom",
        }
    }

    /// Parse request type from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "dataanalysis" => Some(Self::DataAnalysis),
            "tradingsignals" => Some(Self::TradingSignals),
            "computation" => Some(Self::Computation),
            "aiservice" => Some(Self::AiService),
            "contentcreation" => Some(Self::ContentCreation),
            "research" => Some(Self::Research),
            "automation" => Some(Self::Automation),
            "custom" => Some(Self::Custom),
            _ => None,
        }
    }
}

/// Status of a product request
#[derive(Debug, Clone, Copy, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
#[repr(u8)]
pub enum ProductRequestStatus {
    /// Request created, awaiting agent acceptance
    Pending = 0,
    /// Agent has accepted and is working on request
    InProgress = 1,
    /// Work completed, product minted
    Completed = 2,
    /// Request cancelled before completion
    Cancelled = 3,
    /// Request expired without fulfillment
    Expired = 4,
    /// Dispute raised, requires resolution
    Disputed = 5,
}

impl ProductRequestStatus {
    /// Get the status as a string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "Pending",
            Self::InProgress => "InProgress",
            Self::Completed => "Completed",
            Self::Cancelled => "Cancelled",
            Self::Expired => "Expired",
            Self::Disputed => "Disputed",
        }
    }

    /// Check if status transition is valid
    pub fn can_transition_to(&self, new_status: ProductRequestStatus) -> bool {
        match (self, new_status) {
            // From Pending
            (Self::Pending, Self::InProgress) => true,
            (Self::Pending, Self::Cancelled) => true,
            (Self::Pending, Self::Expired) => true,
            
            // From InProgress
            (Self::InProgress, Self::Completed) => true,
            (Self::InProgress, Self::Cancelled) => true,
            (Self::InProgress, Self::Disputed) => true,
            
            // From Completed (mostly terminal, but can be disputed)
            (Self::Completed, Self::Disputed) => true,
            
            // Terminal states
            (Self::Cancelled, _) => false,
            (Self::Expired, _) => false,
            (Self::Disputed, _) => false, // Requires manual resolution
            
            // Same status is always allowed
            (a, b) if a == &b => true,
            
            // All other transitions are invalid
            _ => false,
        }
    }

    /// Check if this is a terminal status
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Cancelled | Self::Expired | Self::Disputed)
    }

    /// Check if this status allows modifications
    pub fn allows_modifications(&self) -> bool {
        matches!(self, Self::Pending | Self::InProgress)
    }
}

/// Types of data products that can be minted
#[derive(Debug, Clone, Copy, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
#[repr(u8)]
pub enum DataProductType {
    /// Market analysis and insights
    MarketAnalysis = 0,
    /// Trading strategies and signals
    TradingStrategy = 1,
    /// Research reports and findings
    ResearchReport = 2,
    /// Trained AI models or algorithms
    AiModel = 3,
    /// Dataset or processed data
    Dataset = 4,
    /// Software tools or scripts
    Software = 5,
    /// Educational content or tutorials
    Educational = 6,
    /// Creative content (art, music, text)
    Creative = 7,
    /// Custom data product type
    Custom = 8,
}

impl DataProductType {
    /// Get all available product types
    pub fn all() -> Vec<Self> {
        vec![
            Self::MarketAnalysis,
            Self::TradingStrategy,
            Self::ResearchReport,
            Self::AiModel,
            Self::Dataset,
            Self::Software,
            Self::Educational,
            Self::Creative,
            Self::Custom,
        ]
    }

    /// Get the product type as a string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::MarketAnalysis => "MarketAnalysis",
            Self::TradingStrategy => "TradingStrategy",
            Self::ResearchReport => "ResearchReport",
            Self::AiModel => "AiModel",
            Self::Dataset => "Dataset",
            Self::Software => "Software",
            Self::Educational => "Educational",
            Self::Creative => "Creative",
            Self::Custom => "Custom",
        }
    }

    /// Parse product type from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "marketanalysis" => Some(Self::MarketAnalysis),
            "tradingstrategy" => Some(Self::TradingStrategy),
            "researchreport" => Some(Self::ResearchReport),
            "aimodel" => Some(Self::AiModel),
            "dataset" => Some(Self::Dataset),
            "software" => Some(Self::Software),
            "educational" => Some(Self::Educational),
            "creative" => Some(Self::Creative),
            "custom" => Some(Self::Custom),
            _ => None,
        }
    }
}

/// Types of capability services agents can offer
#[derive(Debug, Clone, Copy, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
#[repr(u8)]
pub enum CapabilityServiceType {
    /// Real-time data analysis service
    DataAnalysis = 0,
    /// Trading and financial services
    Trading = 1,
    /// AI inference and model services
    AiInference = 2,
    /// Content generation services
    ContentGeneration = 3,
    /// Research and information services
    Research = 4,
    /// Automation and task execution
    Automation = 5,
    /// Consulting and advisory services
    Consulting = 6,
    /// Custom capability service
    Custom = 7,
}

impl CapabilityServiceType {
    /// Get all available service types
    pub fn all() -> Vec<Self> {
        vec![
            Self::DataAnalysis,
            Self::Trading,
            Self::AiInference,
            Self::ContentGeneration,
            Self::Research,
            Self::Automation,
            Self::Consulting,
            Self::Custom,
        ]
    }

    /// Get the service type as a string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::DataAnalysis => "DataAnalysis",
            Self::Trading => "Trading",
            Self::AiInference => "AiInference",
            Self::ContentGeneration => "ContentGeneration",
            Self::Research => "Research",
            Self::Automation => "Automation",
            Self::Consulting => "Consulting",
            Self::Custom => "Custom",
        }
    }

    /// Parse service type from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "dataanalysis" => Some(Self::DataAnalysis),
            "trading" => Some(Self::Trading),
            "aiinference" => Some(Self::AiInference),
            "contentgeneration" => Some(Self::ContentGeneration),
            "research" => Some(Self::Research),
            "automation" => Some(Self::Automation),
            "consulting" => Some(Self::Consulting),
            "custom" => Some(Self::Custom),
            _ => None,
        }
    }
}

/// Product request account data
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProductRequestAccount {
    /// Agent making the request
    pub requester: Pubkey,
    /// Agent who can fulfill request
    pub target_agent: Pubkey,
    /// Type of product/service requested
    pub request_type: ProductRequestType,
    /// Detailed requirements
    pub requirements_description: String,
    /// Payment offered (lamports)
    pub offered_payment: u64,
    /// Unix timestamp deadline
    pub deadline: i64,
    /// Creation timestamp
    pub created_at: i64,
    /// Current status
    pub status: ProductRequestStatus,
    /// Optional escrow account
    pub escrow_account: Option<Pubkey>,
    /// PDA bump seed
    pub bump: u8,
}

impl ProductRequestAccount {
    /// Create a new product request account
    pub fn new(
        requester: Pubkey,
        target_agent: Pubkey,
        request_type: ProductRequestType,
        requirements_description: String,
        offered_payment: u64,
        deadline: i64,
        bump: u8,
    ) -> Result<Self, crate::errors::PodAIError> {
        // Validate requirements description length
        if requirements_description.len() > MAX_REQUIREMENTS_DESCRIPTION_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "requirements_description",
                format!("Description too long: {} > {}", requirements_description.len(), MAX_REQUIREMENTS_DESCRIPTION_LENGTH),
            ));
        }

        // Validate deadline is in the future
        let now = Utc::now().timestamp();
        if deadline <= now {
            return Err(crate::errors::PodAIError::invalid_input(
                "deadline",
                "Deadline must be in the future"
            ));
        }

        Ok(Self {
            requester,
            target_agent,
            request_type,
            requirements_description,
            offered_payment,
            deadline,
            created_at: now,
            status: ProductRequestStatus::Pending,
            escrow_account: None,
            bump,
        })
    }

    /// Get the creation time as DateTime
    pub fn created_at_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.created_at)
    }

    /// Get the deadline as DateTime
    pub fn deadline_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.deadline)
    }

    /// Set the deadline from DateTime
    pub fn set_deadline(&mut self, datetime: DateTime<Utc>) {
        self.deadline = datetime_to_timestamp(datetime);
    }

    /// Check if the request has expired
    pub fn is_expired(&self) -> bool {
        Utc::now().timestamp() > self.deadline
    }

    /// Get time remaining until deadline
    pub fn time_until_deadline(&self) -> chrono::Duration {
        let now = Utc::now().timestamp();
        let remaining_seconds = self.deadline - now;
        chrono::Duration::seconds(remaining_seconds.max(0))
    }

    /// Update status with validation
    pub fn update_status(&mut self, new_status: ProductRequestStatus) -> Result<(), crate::errors::PodAIError> {
        if !self.status.can_transition_to(new_status) {
            return Err(crate::errors::PodAIError::marketplace(
                format!("Invalid status transition from {:?} to {:?}", self.status, new_status)
            ));
        }
        
        self.status = new_status;
        Ok(())
    }

    /// Set escrow account
    pub fn set_escrow_account(&mut self, escrow_account: Pubkey) {
        self.escrow_account = Some(escrow_account);
    }

    /// Clear escrow account
    pub fn clear_escrow_account(&mut self) {
        self.escrow_account = None;
    }
}

impl AccountData for ProductRequestAccount {
    fn discriminator() -> [u8; 8] {
        // This should match the discriminator used by Anchor for ProductRequestAccount
        [123, 45, 167, 89, 234, 78, 156, 91]
    }
}

/// Data product account data
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub struct DataProductAccount {
    /// Agent who created the product
    pub creator: Pubkey,
    /// Optional link to original request
    pub request_id: Option<Pubkey>,
    /// Type of data product
    pub product_type: DataProductType,
    /// Product title
    pub title: String,
    /// Product description
    pub description: String,
    /// Blake3 hash of content
    pub content_hash: [u8; 32],
    /// IPFS content identifier
    pub ipfs_cid: String,
    /// Current price (lamports)
    pub price: u64,
    /// Royalty % (basis points, max 10000)
    pub royalty_percentage: u16,
    /// Creation timestamp
    pub created_at: i64,
    /// Last update timestamp
    pub updated_at: i64,
    /// Total number of sales
    pub total_sales: u32,
    /// Total revenue generated
    pub total_revenue: u64,
    /// Whether product is available
    pub is_active: bool,
    /// PDA bump seed
    pub bump: u8,
}

impl DataProductAccount {
    /// Create a new data product account
    pub fn new(
        creator: Pubkey,
        request_id: Option<Pubkey>,
        product_type: DataProductType,
        title: String,
        description: String,
        content_hash: [u8; 32],
        ipfs_cid: String,
        price: u64,
        royalty_percentage: u16,
        bump: u8,
    ) -> Result<Self, crate::errors::PodAIError> {
        // Validate title length
        if title.len() > MAX_PRODUCT_TITLE_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "title",
                format!("Title too long: {} > {}", title.len(), MAX_PRODUCT_TITLE_LENGTH),
            ));
        }

        // Validate description length
        if description.len() > MAX_PRODUCT_DESCRIPTION_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "description",
                format!("Description too long: {} > {}", description.len(), MAX_PRODUCT_DESCRIPTION_LENGTH),
            ));
        }

        // Validate IPFS CID length
        if ipfs_cid.len() > MAX_IPFS_CID_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "ipfs_cid",
                format!("IPFS CID too long: {} > {}", ipfs_cid.len(), MAX_IPFS_CID_LENGTH),
            ));
        }

        // Validate royalty percentage
        if royalty_percentage > MAX_ROYALTY_PERCENTAGE {
            return Err(crate::errors::PodAIError::invalid_input(
                "royalty_percentage",
                format!("Royalty too high: {} > {}", royalty_percentage, MAX_ROYALTY_PERCENTAGE),
            ));
        }

        // Validate price is not zero
        if price == 0 {
            return Err(crate::errors::PodAIError::marketplace(
                "Product price cannot be zero"
            ));
        }

        let now = Utc::now().timestamp();
        Ok(Self {
            creator,
            request_id,
            product_type,
            title,
            description,
            content_hash,
            ipfs_cid,
            price,
            royalty_percentage,
            created_at: now,
            updated_at: now,
            total_sales: 0,
            total_revenue: 0,
            is_active: true,
            bump,
        })
    }

    /// Get the creation time as DateTime
    pub fn created_at_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.created_at)
    }

    /// Get the update time as DateTime
    pub fn updated_at_datetime(&self) -> DateTime<Utc> {
        timestamp_to_datetime(self.updated_at)
    }

    /// Update the product (marks as updated)
    pub fn mark_updated(&mut self) {
        self.updated_at = Utc::now().timestamp();
    }

    /// Record a sale
    pub fn record_sale(&mut self, sale_price: u64) {
        self.total_sales += 1;
        self.total_revenue = self.total_revenue.saturating_add(sale_price);
        self.mark_updated();
    }

    /// Calculate average sale price
    pub fn average_sale_price(&self) -> u64 {
        if self.total_sales == 0 {
            self.price
        } else {
            self.total_revenue / (self.total_sales as u64)
        }
    }

    /// Calculate royalty amount for a given sale price
    pub fn calculate_royalty(&self, sale_price: u64) -> u64 {
        (sale_price * self.royalty_percentage as u64) / 10000
    }

    /// Activate the product
    pub fn activate(&mut self) {
        self.is_active = true;
        self.mark_updated();
    }

    /// Deactivate the product
    pub fn deactivate(&mut self) {
        self.is_active = false;
        self.mark_updated();
    }

    /// Update price
    pub fn update_price(&mut self, new_price: u64) -> Result<(), crate::errors::PodAIError> {
        if new_price == 0 {
            return Err(crate::errors::PodAIError::marketplace(
                "Product price cannot be zero"
            ));
        }
        
        self.price = new_price;
        self.mark_updated();
        Ok(())
    }

    /// Get content hash as hex string
    pub fn content_hash_hex(&self) -> String {
        hex::encode(self.content_hash)
    }
}

impl AccountData for DataProductAccount {
    fn discriminator() -> [u8; 8] {
        // This should match the discriminator used by Anchor for DataProductAccount
        [45, 167, 234, 123, 78, 156, 91, 89]
    }
}

/// Capability service account data
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, Serialize, Deserialize, PartialEq, Eq)]
pub struct CapabilityServiceAccount {
    /// Agent providing the service
    pub provider: Pubkey,
    /// Type of capability service
    pub service_type: CapabilityServiceType,
    /// Name of the service
    pub service_name: String,
    /// Detailed service description
    pub service_description: String,
    /// Base price for service (lamports)
    pub base_price: u64,
    /// Estimated completion time (seconds)
    pub estimated_completion_time: u64,
    /// Maximum concurrent requests
    pub max_concurrent_requests: u32,
    /// Current active requests
    pub current_active_requests: u32,
    /// Total completed requests
    pub total_completed: u64,
    /// Average rating (scaled by 1000)
    pub average_rating: u32,
    /// Total revenue from service
    pub total_revenue: u64,
    /// Whether service is available
    pub is_available: bool,
    /// Whether escrow is required
    pub requires_escrow: bool,
    /// PDA bump seed
    pub bump: u8,
}

impl CapabilityServiceAccount {
    /// Create a new capability service account
    pub fn new(
        provider: Pubkey,
        service_type: CapabilityServiceType,
        service_name: String,
        service_description: String,
        base_price: u64,
        estimated_completion_time: u64,
        max_concurrent_requests: u32,
        requires_escrow: bool,
        bump: u8,
    ) -> Result<Self, crate::errors::PodAIError> {
        // Validate service name length
        if service_name.len() > MAX_SERVICE_NAME_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "service_name",
                format!("Name too long: {} > {}", service_name.len(), MAX_SERVICE_NAME_LENGTH),
            ));
        }

        // Validate service description length
        if service_description.len() > MAX_SERVICE_DESCRIPTION_LENGTH {
            return Err(crate::errors::PodAIError::invalid_input(
                "service_description",
                format!("Description too long: {} > {}", service_description.len(), MAX_SERVICE_DESCRIPTION_LENGTH),
            ));
        }

        Ok(Self {
            provider,
            service_type,
            service_name,
            service_description,
            base_price,
            estimated_completion_time,
            max_concurrent_requests,
            current_active_requests: 0,
            total_completed: 0,
            average_rating: 0,
            total_revenue: 0,
            is_available: true,
            requires_escrow,
            bump,
        })
    }

    /// Check if service is at capacity
    pub fn is_at_capacity(&self) -> bool {
        self.current_active_requests >= self.max_concurrent_requests
    }

    /// Check if service has availability
    pub fn has_availability(&self) -> bool {
        self.is_available && !self.is_at_capacity()
    }

    /// Add an active request
    pub fn add_active_request(&mut self) -> Result<(), crate::errors::PodAIError> {
        if self.is_at_capacity() {
            return Err(crate::errors::PodAIError::marketplace("Service at capacity"));
        }
        
        self.current_active_requests += 1;
        Ok(())
    }

    /// Remove an active request and record completion
    pub fn complete_request(&mut self, revenue: u64, rating: u32) -> Result<(), crate::errors::PodAIError> {
        if self.current_active_requests == 0 {
            return Err(crate::errors::PodAIError::marketplace("No active requests to complete"));
        }
        
        self.current_active_requests -= 1;
        self.total_completed += 1;
        self.total_revenue = self.total_revenue.saturating_add(revenue);
        
        // Update average rating
        if rating <= 5000 { // Max rating of 5.0 (scaled by 1000)
            let total_ratings = self.total_completed;
            self.average_rating = ((self.average_rating as u64 * (total_ratings - 1)) + rating as u64) as u32 / total_ratings as u32;
        }
        
        Ok(())
    }

    /// Get average rating as a float (0.0 to 5.0)
    pub fn average_rating_float(&self) -> f32 {
        self.average_rating as f32 / 1000.0
    }

    /// Set service availability
    pub fn set_availability(&mut self, available: bool) {
        self.is_available = available;
    }

    /// Update base price
    pub fn update_base_price(&mut self, new_price: u64) {
        self.base_price = new_price;
    }

    /// Get available capacity
    pub fn available_capacity(&self) -> u32 {
        self.max_concurrent_requests.saturating_sub(self.current_active_requests)
    }

    /// Calculate efficiency ratio (completed per active)
    pub fn efficiency_ratio(&self) -> f64 {
        if self.current_active_requests == 0 {
            return 1.0;
        }
        
        self.total_completed as f64 / self.current_active_requests as f64
    }
}

impl AccountData for CapabilityServiceAccount {
    fn discriminator() -> [u8; 8] {
        // This should match the discriminator used by Anchor for CapabilityServiceAccount
        [167, 234, 45, 123, 156, 78, 91, 89]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_product_request_types() {
        assert_eq!(ProductRequestType::DataAnalysis.as_str(), "DataAnalysis");
        assert_eq!(ProductRequestType::from_str("DataAnalysis"), Some(ProductRequestType::DataAnalysis));
        assert_eq!(ProductRequestType::from_str("invalid"), None);
    }

    #[test]
    fn test_product_request_status_transitions() {
        let pending = ProductRequestStatus::Pending;
        assert!(pending.can_transition_to(ProductRequestStatus::InProgress));
        assert!(pending.can_transition_to(ProductRequestStatus::Cancelled));
        assert!(!pending.can_transition_to(ProductRequestStatus::Completed));

        let in_progress = ProductRequestStatus::InProgress;
        assert!(in_progress.can_transition_to(ProductRequestStatus::Completed));
        assert!(in_progress.can_transition_to(ProductRequestStatus::Disputed));
        assert!(!in_progress.can_transition_to(ProductRequestStatus::Pending));
    }

    #[test]
    fn test_data_product_creation() {
        let creator = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let product = DataProductAccount::new(
            creator,
            None,
            DataProductType::MarketAnalysis,
            "Test Product".to_string(),
            "A test product".to_string(),
            [1u8; 32],
            "QmTest123".to_string(),
            1000,
            500, // 5%
            255,
        ).unwrap();

        assert_eq!(product.creator, creator);
        assert_eq!(product.product_type, DataProductType::MarketAnalysis);
        assert_eq!(product.price, 1000);
        assert_eq!(product.royalty_percentage, 500);
        assert!(product.is_active);
        assert_eq!(product.total_sales, 0);
    }

    #[test]
    fn test_data_product_sales() {
        let creator = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let mut product = DataProductAccount::new(
            creator,
            None,
            DataProductType::Dataset,
            "Test".to_string(),
            "Test".to_string(),
            [1u8; 32],
            "QmTest".to_string(),
            1000,
            500,
            255,
        ).unwrap();

        // Record sales
        product.record_sale(1200);
        assert_eq!(product.total_sales, 1);
        assert_eq!(product.total_revenue, 1200);

        product.record_sale(800);
        assert_eq!(product.total_sales, 2);
        assert_eq!(product.total_revenue, 2000);
        assert_eq!(product.average_sale_price(), 1000);

        // Test royalty calculation
        let royalty = product.calculate_royalty(1000);
        assert_eq!(royalty, 50); // 5% of 1000
    }

    #[test]
    fn test_capability_service() {
        let provider = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let mut service = CapabilityServiceAccount::new(
            provider,
            CapabilityServiceType::DataAnalysis,
            "Data Analysis Service".to_string(),
            "Professional data analysis".to_string(),
            5000,
            3600, // 1 hour
            5,
            true,
            255,
        ).unwrap();

        assert_eq!(service.provider, provider);
        assert_eq!(service.max_concurrent_requests, 5);
        assert!(service.has_availability());
        assert!(!service.is_at_capacity());

        // Add requests
        assert!(service.add_active_request().is_ok());
        assert_eq!(service.current_active_requests, 1);
        assert_eq!(service.available_capacity(), 4);

        // Complete request
        assert!(service.complete_request(5000, 4500).is_ok()); // 4.5 rating
        assert_eq!(service.current_active_requests, 0);
        assert_eq!(service.total_completed, 1);
        assert_eq!(service.total_revenue, 5000);
        assert_eq!(service.average_rating, 4500);
        assert_eq!(service.average_rating_float(), 4.5);
    }

    #[test]
    fn test_validation_errors() {
        let creator = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        
        // Test long title
        let long_title = "a".repeat(MAX_PRODUCT_TITLE_LENGTH + 1);
        let result = DataProductAccount::new(
            creator,
            None,
            DataProductType::Dataset,
            long_title,
            "Test".to_string(),
            [1u8; 32],
            "QmTest".to_string(),
            1000,
            500,
            255,
        );
        assert!(result.is_err());

        // Test zero price
        let result = DataProductAccount::new(
            creator,
            None,
            DataProductType::Dataset,
            "Test".to_string(),
            "Test".to_string(),
            [1u8; 32],
            "QmTest".to_string(),
            0, // Zero price
            500,
            255,
        );
        assert!(result.is_err());
    }
} 