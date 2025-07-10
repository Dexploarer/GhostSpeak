use anchor_lang::prelude::*;
use podai::state::{Agent, PricingModel};

#[cfg(test)]
mod agent_tests {
    
    #[test]
    fn test_agent_creation() {
        // Test creating a new agent
        let owner = Pubkey::new_unique();
        let name = "Test Agent";
        let description = "A test agent for unit testing";
        let original_price = 100u64;
        
        // Create agent struct (matching the actual Agent struct in lib.rs)
        let agent = Agent {
            owner,
            name: name.to_string(),
            description: description.to_string(),
            capabilities: vec!["testing".to_string(), "validation".to_string()],
            pricing_model: PricingModel::Fixed,
            reputation_score: 100,
            total_jobs_completed: 0,
            total_earnings: 0,
            is_active: true,
            created_at: 1234567890,
            updated_at: 1234567890,
            original_price,
            genome_hash: "test_genome_hash".to_string(),
            is_replicable: false,
            replication_fee: 0,
            service_endpoint: "https://test.agent.com".to_string(),
            is_verified: false,
            verification_timestamp: 0,
            metadata_uri: "ipfs://test".to_string(),
            bump: 1,
        };
        
        // Validate agent fields
        assert_eq!(agent.owner, owner);
        assert_eq!(agent.name, name);
        assert_eq!(agent.original_price, original_price);
        assert_eq!(agent.reputation_score, 100);
        assert!(agent.is_active);
        assert_eq!(agent.total_jobs_completed, 0);
    }
    
    #[test]
    fn test_agent_update() {
        // Test updating agent information
        let owner = Pubkey::new_unique();
        let mut agent = Agent {
            owner,
            name: "Original Name".to_string(),
            description: "Original Description".to_string(),
            capabilities: vec!["capability1".to_string()],
            pricing_model: PricingModel::Fixed,
            reputation_score: 100,
            total_jobs_completed: 5,
            total_earnings: 500,
            is_active: true,
            created_at: 1234567890,
            updated_at: 1234567890,
            original_price: 50,
            genome_hash: "test_genome".to_string(),
            is_replicable: true,
            replication_fee: 10,
            bump: 1,
        };
        
        // Update fields
        agent.name = "Updated Name".to_string();
        agent.description = "Updated Description".to_string();
        agent.original_price = 75;
        agent.capabilities.push("capability2".to_string());
        agent.updated_at = 1234567900;
        
        // Validate updates
        assert_eq!(agent.name, "Updated Name");
        assert_eq!(agent.original_price, 75);
        assert_eq!(agent.capabilities.len(), 2);
        assert_eq!(agent.updated_at, 1234567900);
        
        // Ensure immutable fields remain unchanged
        assert_eq!(agent.owner, owner);
        assert_eq!(agent.created_at, 1234567890);
    }
    
    #[test]
    fn test_agent_deactivation() {
        // Test deactivating an agent
        let mut agent = Agent {
            owner: Pubkey::new_unique(),
            name: "Active Agent".to_string(),
            description: "Currently active".to_string(),
            capabilities: vec![],
            pricing_model: PricingModel::Fixed,
            reputation_score: 95,
            total_jobs_completed: 10,
            total_earnings: 1000,
            is_active: true,
            created_at: 1234567890,
            updated_at: 1234567890,
            original_price: 100,
            genome_hash: "test_genome".to_string(),
            is_replicable: false,
            replication_fee: 0,
            service_endpoint: "https://test.agent.com".to_string(),
            is_verified: false,
            verification_timestamp: 0,
            metadata_uri: "ipfs://test".to_string(),
            bump: 1,
        };
        
        assert!(agent.is_active, "Agent should start active");
        
        // Deactivate
        agent.is_active = false;
        assert!(!agent.is_active, "Agent should be deactivated");
        
        // Reputation and completed jobs should remain
        assert_eq!(agent.reputation_score, 95);
        assert_eq!(agent.total_jobs_completed, 10);
    }
    
    #[test]
    fn test_reputation_scoring() {
        // Test reputation score updates
        let mut agent = Agent {
            owner: Pubkey::new_unique(),
            name: "Rep Test Agent".to_string(),
            description: "Testing reputation".to_string(),
            capabilities: vec![],
            pricing_model: PricingModel::Fixed,
            reputation_score: 100,
            total_jobs_completed: 0,
            total_earnings: 0,
            is_active: true,
            created_at: 1234567890,
            updated_at: 1234567890,
            original_price: 50,
            genome_hash: "test_genome".to_string(),
            is_replicable: false,
            replication_fee: 0,
            service_endpoint: "https://test.agent.com".to_string(),
            is_verified: false,
            verification_timestamp: 0,
            metadata_uri: "ipfs://test".to_string(),
            bump: 1,
        };
        
        // Complete a job successfully
        agent.total_jobs_completed += 1;
        agent.reputation_score = 105; // Increased for successful completion
        agent.total_earnings += 50;
        
        assert_eq!(agent.total_jobs_completed, 1);
        assert_eq!(agent.reputation_score, 105);
        
        // Simulate a failed job
        agent.reputation_score = agent.reputation_score.saturating_sub(10);
        assert_eq!(agent.reputation_score, 95);
        
        // Ensure reputation can't go below 0
        agent.reputation_score = agent.reputation_score.saturating_sub(100);
        assert_eq!(agent.reputation_score, 0);
    }
    
    #[test]
    fn test_pricing_validation() {
        // Test price boundaries
        let owner = Pubkey::new_unique();
        
        // Test minimum price
        let min_price_agent = Agent {
            owner,
            name: "Min Price Agent".to_string(),
            description: "Testing minimum price".to_string(),
            capabilities: vec![],
            pricing_model: PricingModel::Fixed,
            reputation_score: 100,
            total_jobs_completed: 0,
            total_earnings: 0,
            is_active: true,
            created_at: 1234567890,
            updated_at: 1234567890,
            original_price: 0, // Minimum possible price
            genome_hash: "test_genome".to_string(),
            is_replicable: false,
            replication_fee: 0,
            service_endpoint: "https://test.agent.com".to_string(),
            is_verified: false,
            verification_timestamp: 0,
            metadata_uri: "ipfs://test".to_string(),
            bump: 1,
        };
        
        assert_eq!(min_price_agent.original_price, 0);
        
        // Test reasonable price
        let reasonable_price = 1000u64;
        assert!(reasonable_price > 0 && reasonable_price < u64::MAX);
    }
    
    #[test]
    fn test_capability_management() {
        // Test capability additions and removals
        let mut agent = Agent {
            owner: Pubkey::new_unique(),
            name: "Capability Agent".to_string(),
            description: "Testing capabilities".to_string(),
            capabilities: vec!["initial".to_string()],
            pricing_model: PricingModel::Fixed,
            reputation_score: 100,
            total_jobs_completed: 0,
            total_earnings: 0,
            is_active: true,
            created_at: 1234567890,
            updated_at: 1234567890,
            original_price: 50,
            genome_hash: "test_genome".to_string(),
            is_replicable: false,
            replication_fee: 0,
            service_endpoint: "https://test.agent.com".to_string(),
            is_verified: false,
            verification_timestamp: 0,
            metadata_uri: "ipfs://test".to_string(),
            bump: 1,
        };
        
        // Add capabilities
        agent.capabilities.push("coding".to_string());
        agent.capabilities.push("analysis".to_string());
        assert_eq!(agent.capabilities.len(), 3);
        
        // Check specific capability exists
        assert!(agent.capabilities.contains(&"coding".to_string()));
        
        // Remove a capability
        agent.capabilities.retain(|c| c != "initial");
        assert_eq!(agent.capabilities.len(), 2);
        assert!(!agent.capabilities.contains(&"initial".to_string()));
    }
    
    #[test]
    fn test_replication_settings() {
        // Test agent replication functionality
        let mut agent = Agent {
            owner: Pubkey::new_unique(),
            name: "Replicable Agent".to_string(),
            description: "Testing replication".to_string(),
            capabilities: vec!["ai".to_string()],
            pricing_model: PricingModel::Fixed,
            reputation_score: 150,
            total_jobs_completed: 20,
            total_earnings: 2000,
            is_active: true,
            created_at: 1234567890,
            updated_at: 1234567890,
            original_price: 100,
            genome_hash: "unique_genome_123".to_string(),
            is_replicable: false,
            replication_fee: 0,
            bump: 1,
        };
        
        // Initially not replicable
        assert!(!agent.is_replicable);
        assert_eq!(agent.replication_fee, 0);
        
        // Enable replication
        agent.is_replicable = true;
        agent.replication_fee = 250;
        
        assert!(agent.is_replicable);
        assert_eq!(agent.replication_fee, 250);
        
        // Verify genome hash remains unique
        assert_eq!(agent.genome_hash, "unique_genome_123");
    }
    
    #[test]
    fn test_timestamp_tracking() {
        // Test timestamp fields
        let current_time = 1234567890i64;
        let future_time = 1234567900i64;
        
        let mut agent = Agent {
            owner: Pubkey::new_unique(),
            name: "Time Agent".to_string(),
            description: "Testing timestamps".to_string(),
            capabilities: vec![],
            pricing_model: PricingModel::Fixed,
            reputation_score: 100,
            total_jobs_completed: 0,
            total_earnings: 0,
            is_active: true,
            created_at: current_time,
            updated_at: current_time,
            original_price: 50,
            genome_hash: "test_genome".to_string(),
            is_replicable: false,
            replication_fee: 0,
            service_endpoint: "https://test.agent.com".to_string(),
            is_verified: false,
            verification_timestamp: 0,
            metadata_uri: "ipfs://test".to_string(),
            bump: 1,
        };
        
        assert_eq!(agent.created_at, agent.updated_at);
        
        // Update timestamp
        agent.updated_at = future_time;
        assert!(agent.updated_at > agent.created_at);
        assert_eq!(agent.updated_at - agent.created_at, 10);
    }
}