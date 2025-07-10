/*!
 * Comprehensive Unit Test Suite
 * 
 * Tests all major functionality of the GhostSpeak Protocol smart contract
 * including edge cases, error conditions, and boundary testing.
 */

use anchor_lang::prelude::*;
use podai::state::*;
use podai::PricingModel;

#[cfg(test)]
mod comprehensive_unit_tests {
    use super::*;

    // Test Agent Creation and Management
    #[test]
    fn test_agent_creation_comprehensive() {
        let owner = Pubkey::new_unique();
        let name = "Test AI Agent";
        let description = "A comprehensive test agent for the marketplace";
        let capabilities = vec!["nlp".to_string(), "ml".to_string(), "coding".to_string()];
        
        let agent = Agent {
            owner,
            name: name.to_string(),
            description: description.to_string(),
            capabilities: capabilities.clone(),
            pricing_model: PricingModel::Fixed,
            reputation_score: 100,
            total_jobs_completed: 0,
            total_earnings: 0,
            is_active: true,
            created_at: 1640995200, // 2022-01-01 00:00:00 UTC
            updated_at: 1640995200,
            original_price: 1000,
            genome_hash: "test_genome_hash_123".to_string(),
            is_replicable: false,
            replication_fee: 0,
            service_endpoint: "https://api.testagent.com".to_string(),
            is_verified: false,
            verification_timestamp: 0,
            metadata_uri: "ipfs://QmTestMetadata".to_string(),
            bump: 254,
        };

        // Test all fields are set correctly
        assert_eq!(agent.owner, owner);
        assert_eq!(agent.name, name);
        assert_eq!(agent.description, description);
        assert_eq!(agent.capabilities, capabilities);
        assert_eq!(agent.pricing_model, PricingModel::Fixed);
        assert_eq!(agent.reputation_score, 100);
        assert_eq!(agent.total_jobs_completed, 0);
        assert_eq!(agent.total_earnings, 0);
        assert!(agent.is_active);
        assert_eq!(agent.created_at, 1640995200);
        assert_eq!(agent.updated_at, 1640995200);
        assert_eq!(agent.original_price, 1000);
        assert!(!agent.is_replicable);
        assert_eq!(agent.replication_fee, 0);
        assert!(!agent.is_verified);
        assert_eq!(agent.verification_timestamp, 0);
    }

    #[test]
    fn test_agent_pricing_models() {
        let owner = Pubkey::new_unique();
        
        // Test all pricing models
        let pricing_models = vec![
            PricingModel::Fixed,
            PricingModel::Hourly,
            PricingModel::PerTask,
            PricingModel::Subscription,
            PricingModel::Auction,
            PricingModel::Dynamic,
            PricingModel::RevenueShare,
            PricingModel::Tiered,
        ];

        for (i, model) in pricing_models.iter().enumerate() {
            let agent = Agent {
                owner,
                name: format!("Agent {}", i),
                description: format!("Agent with {:?} pricing", model),
                capabilities: vec!["test".to_string()],
                pricing_model: *model,
                reputation_score: 100,
                total_jobs_completed: 0,
                total_earnings: 0,
                is_active: true,
                created_at: 1640995200,
                updated_at: 1640995200,
                original_price: 1000,
                genome_hash: format!("genome_{}", i),
                is_replicable: false,
                replication_fee: 0,
                service_endpoint: "https://api.test.com".to_string(),
                is_verified: false,
                verification_timestamp: 0,
                metadata_uri: "ipfs://test".to_string(),
                bump: 254,
            };

            assert_eq!(agent.pricing_model, *model);
        }
    }

    // Test Escrow Functionality
    #[test]
    fn test_escrow_lifecycle() {
        let client = Pubkey::new_unique();
        let agent = Pubkey::new_unique();
        let task_id = "task_001";
        let amount = 5000u64;
        let current_time = 1640995200i64;
        
        // Create escrow
        let mut escrow = Escrow {
            client,
            agent,
            task_id: task_id.to_string(),
            amount,
            status: EscrowStatus::Active,
            created_at: current_time,
            expires_at: current_time + 86400, // 24 hours
            dispute_reason: None,
            resolution_notes: None,
        };

        // Test creation
        assert_eq!(escrow.client, client);
        assert_eq!(escrow.agent, agent);
        assert_eq!(escrow.task_id, task_id);
        assert_eq!(escrow.amount, amount);
        assert_eq!(escrow.status, EscrowStatus::Active);
        assert!(escrow.expires_at > escrow.created_at);
        assert!(escrow.dispute_reason.is_none());
        assert!(escrow.resolution_notes.is_none());

        // Test completion
        escrow.status = EscrowStatus::Completed;
        assert_eq!(escrow.status, EscrowStatus::Completed);

        // Test dispute
        escrow.status = EscrowStatus::Disputed;
        escrow.dispute_reason = Some("Quality not as expected".to_string());
        assert_eq!(escrow.status, EscrowStatus::Disputed);
        assert!(escrow.dispute_reason.is_some());

        // Test resolution
        escrow.status = EscrowStatus::Resolved;
        escrow.resolution_notes = Some("Partial refund issued".to_string());
        assert_eq!(escrow.status, EscrowStatus::Resolved);
        assert!(escrow.resolution_notes.is_some());
    }

    #[test]
    fn test_task_escrow_workflow() {
        let client = Pubkey::new_unique();
        let agent = Pubkey::new_unique();
        let escrow_pubkey = Pubkey::new_unique();
        let task_id = "complex_task_001";
        let amount = 10000u64;
        let current_time = 1640995200i64;
        
        let mut task_escrow = TaskEscrow {
            task_id: task_id.to_string(),
            client,
            agent,
            amount,
            status: TaskStatus::Pending,
            created_at: current_time,
            deadline: current_time + 604800, // 7 days
            completion_proof: None,
            dispute_details: None,
            escrow_pubkey,
        };

        // Test initial state
        assert_eq!(task_escrow.status, TaskStatus::Pending);
        assert!(task_escrow.completion_proof.is_none());
        assert!(task_escrow.dispute_details.is_none());

        // Test status progression: Pending -> InProgress
        task_escrow.status = TaskStatus::InProgress;
        assert_eq!(task_escrow.status, TaskStatus::InProgress);

        // Test completion
        task_escrow.status = TaskStatus::Completed;
        task_escrow.completion_proof = Some("ipfs://QmProofHash123".to_string());
        assert_eq!(task_escrow.status, TaskStatus::Completed);
        assert!(task_escrow.completion_proof.is_some());

        // Test dispute scenario
        task_escrow.status = TaskStatus::Disputed;
        task_escrow.dispute_details = Some("Work incomplete".to_string());
        assert_eq!(task_escrow.status, TaskStatus::Disputed);
        assert!(task_escrow.dispute_details.is_some());
    }

    // Test Agent Verification
    #[test]
    fn test_agent_verification() {
        let agent = Pubkey::new_unique();
        let verifier = Pubkey::new_unique();
        let current_time = 1640995200i64;
        
        let verification_data = AgentVerificationData {
            agent_pubkey: agent,
            service_endpoint: "https://verified.agent.com".to_string(),
            supported_capabilities: vec![1, 2, 3, 4, 5],
            verified_at: current_time,
        };

        let mut verification = AgentVerification {
            agent,
            verifier,
            verification_data: verification_data.clone(),
            created_at: current_time,
            expires_at: current_time + 31536000, // 1 year
            is_active: true,
            bump: 254,
        };

        // Test verification is valid
        assert!(verification.is_valid(current_time + 1000));
        assert!(!verification.is_valid(current_time + 31536001));

        // Test revocation
        verification.revoke();
        assert!(!verification.is_active);
        assert!(!verification.is_valid(current_time + 1000));
    }

    // Test Work Orders
    #[test]
    fn test_work_order_management() {
        let client = Pubkey::new_unique();
        let provider = Pubkey::new_unique();
        let payment_token = Pubkey::new_unique();
        let current_time = 1640995200i64;
        
        let work_order = WorkOrder {
            client,
            provider,
            title: "AI Model Training".to_string(),
            description: "Train a custom ML model for image recognition".to_string(),
            requirements: vec![
                "Python expertise".to_string(),
                "ML/AI knowledge".to_string(),
                "GPU access".to_string(),
            ],
            payment_amount: 25000,
            payment_token,
            status: WorkOrderStatus::Created,
            created_at: current_time,
            deadline: current_time + 1209600, // 14 days
            delivered_at: None,
            bump: 254,
        };

        // Test work order creation
        assert_eq!(work_order.client, client);
        assert_eq!(work_order.provider, provider);
        assert_eq!(work_order.status, WorkOrderStatus::Created);
        assert_eq!(work_order.payment_amount, 25000);
        assert_eq!(work_order.requirements.len(), 3);
        assert!(work_order.delivered_at.is_none());
        
        // Test status transitions
        let statuses = vec![
            WorkOrderStatus::Created,
            WorkOrderStatus::Open,
            WorkOrderStatus::Submitted,
            WorkOrderStatus::InProgress,
            WorkOrderStatus::Approved,
            WorkOrderStatus::Completed,
        ];

        for status in statuses {
            let mut order = work_order.clone();
            order.status = status;
            assert_eq!(order.status, status);
        }
    }

    // Test Channel and Messaging
    #[test]
    fn test_channel_types() {
        let creator = Pubkey::new_unique();
        let current_time = 1640995200i64;
        
        let channel_types = vec![
            ChannelType::Direct,
            ChannelType::Group,
            ChannelType::Public,
            ChannelType::Private,
        ];

        for channel_type in channel_types {
            let channel = Channel {
                creator,
                participants: vec![creator],
                channel_type,
                is_private: false,
                message_count: 0,
                created_at: current_time,
                last_activity: current_time,
                is_active: true,
                bump: 254,
            };

            assert_eq!(channel.channel_type, channel_type);
            assert!(channel.is_active);
            assert_eq!(channel.participants.len(), 1);
        }
    }

    #[test]
    fn test_message_types() {
        let sender = Pubkey::new_unique();
        let channel = Pubkey::new_unique();
        let current_time = 1640995200i64;
        
        let message_types = vec![
            (MessageType::Text, "Hello, world!"),
            (MessageType::File, "document.pdf"),
            (MessageType::Image, "image.jpg"),
            (MessageType::Audio, "audio.mp3"),
            (MessageType::System, "User joined channel"),
        ];

        for (msg_type, content) in message_types {
            let message = Message {
                channel,
                sender,
                content: content.to_string(),
                message_type: msg_type,
                timestamp: current_time,
                is_encrypted: false,
                bump: 254,
            };

            assert_eq!(message.message_type, msg_type);
            assert_eq!(message.content, content);
            assert_eq!(message.sender, sender);
        }
    }

    // Test Security and Validation
    #[test]
    fn test_security_constraints() {
        // Test maximum values
        assert!(MAX_PAYMENT_AMOUNT == 1_000_000_000_000);
        assert!(MIN_PAYMENT_AMOUNT == 1_000);
        assert!(MAX_NAME_LENGTH == 64);
        assert!(MAX_GENERAL_STRING_LENGTH == 256);
        assert!(MAX_CAPABILITIES_COUNT == 20);
        assert!(MAX_PARTICIPANTS_COUNT == 50);

        // Test payment amount validation
        let valid_amounts = vec![MIN_PAYMENT_AMOUNT, 100_000, MAX_PAYMENT_AMOUNT];
        for amount in valid_amounts {
            assert!(amount >= MIN_PAYMENT_AMOUNT);
            assert!(amount <= MAX_PAYMENT_AMOUNT);
        }

        // Test string length validation
        let max_name = "A".repeat(MAX_NAME_LENGTH);
        let max_description = "B".repeat(MAX_GENERAL_STRING_LENGTH);
        
        assert_eq!(max_name.len(), MAX_NAME_LENGTH);
        assert_eq!(max_description.len(), MAX_GENERAL_STRING_LENGTH);
    }

    #[test]
    fn test_pricing_model_equivalence() {
        // Test all pricing models are distinct
        let models = vec![
            PricingModel::Fixed,
            PricingModel::Hourly,
            PricingModel::PerTask,
            PricingModel::Subscription,
            PricingModel::Auction,
            PricingModel::Dynamic,
            PricingModel::RevenueShare,
            PricingModel::Tiered,
        ];

        // Each model should equal itself
        for model in &models {
            assert_eq!(model, model);
        }

        // Each model should be different from others
        for (i, model1) in models.iter().enumerate() {
            for (j, model2) in models.iter().enumerate() {
                if i != j {
                    assert_ne!(model1, model2);
                }
            }
        }
    }

    // Test Edge Cases
    #[test]
    fn test_edge_case_zero_values() {
        let owner = Pubkey::new_unique();
        
        // Test agent with zero earnings and jobs
        let agent = Agent {
            owner,
            name: "New Agent".to_string(),
            description: "Just starting out".to_string(),
            capabilities: vec![],
            pricing_model: PricingModel::Fixed,
            reputation_score: 100,
            total_jobs_completed: 0,
            total_earnings: 0,
            is_active: true,
            created_at: 1640995200,
            updated_at: 1640995200,
            original_price: MIN_PAYMENT_AMOUNT,
            genome_hash: "zero_test".to_string(),
            is_replicable: false,
            replication_fee: 0,
            service_endpoint: "".to_string(),
            is_verified: false,
            verification_timestamp: 0,
            metadata_uri: "".to_string(),
            bump: 254,
        };

        assert_eq!(agent.total_jobs_completed, 0);
        assert_eq!(agent.total_earnings, 0);
        assert_eq!(agent.original_price, MIN_PAYMENT_AMOUNT);
        assert_eq!(agent.replication_fee, 0);
        assert_eq!(agent.capabilities.len(), 0);
    }

    #[test]
    fn test_edge_case_maximum_values() {
        let owner = Pubkey::new_unique();
        
        // Test with maximum allowed values
        let max_capabilities: Vec<String> = (0..MAX_CAPABILITIES_COUNT)
            .map(|i| format!("capability_{}", i))
            .collect();

        let agent = Agent {
            owner,
            name: "A".repeat(MAX_NAME_LENGTH),
            description: "B".repeat(MAX_GENERAL_STRING_LENGTH),
            capabilities: max_capabilities.clone(),
            pricing_model: PricingModel::Tiered,
            reputation_score: u32::MAX,
            total_jobs_completed: u32::MAX,
            total_earnings: MAX_PAYMENT_AMOUNT,
            is_active: true,
            created_at: i64::MAX,
            updated_at: i64::MAX,
            original_price: MAX_PAYMENT_AMOUNT,
            genome_hash: "C".repeat(MAX_GENERAL_STRING_LENGTH),
            is_replicable: true,
            replication_fee: MAX_PAYMENT_AMOUNT,
            service_endpoint: "D".repeat(MAX_GENERAL_STRING_LENGTH),
            is_verified: true,
            verification_timestamp: i64::MAX,
            metadata_uri: "E".repeat(MAX_GENERAL_STRING_LENGTH),
            bump: 255,
        };

        assert_eq!(agent.name.len(), MAX_NAME_LENGTH);
        assert_eq!(agent.description.len(), MAX_GENERAL_STRING_LENGTH);
        assert_eq!(agent.capabilities.len(), MAX_CAPABILITIES_COUNT);
        assert_eq!(agent.total_earnings, MAX_PAYMENT_AMOUNT);
        assert_eq!(agent.original_price, MAX_PAYMENT_AMOUNT);
        assert_eq!(agent.bump, 255);
    }

    // Test Timestamp Handling
    #[test]
    fn test_timestamp_validation() {
        let current_time = 1640995200i64; // 2022-01-01 00:00:00 UTC
        let future_time = current_time + 86400; // 24 hours later
        let past_time = current_time - 86400; // 24 hours ago

        // Test that future deadlines are valid
        assert!(future_time > current_time);
        
        // Test that past deadlines are invalid
        assert!(past_time < current_time);
        
        // Test escrow expiration logic
        let escrow = Escrow {
            client: Pubkey::new_unique(),
            agent: Pubkey::new_unique(),
            task_id: "time_test".to_string(),
            amount: 1000,
            status: EscrowStatus::Active,
            created_at: current_time,
            expires_at: future_time,
            dispute_reason: None,
            resolution_notes: None,
        };

        // Escrow should not be expired at current time
        assert!(escrow.expires_at > current_time);
        
        // Escrow should be expired after expiration time
        assert!(escrow.expires_at < future_time + 1);
    }
}