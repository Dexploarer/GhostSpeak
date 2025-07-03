//! Agent Replication Service for podAI SDK
//!
//! Provides agent replication and customization capabilities

use crate::{client::PodAIClient, errors::PodAIResult};
use solana_sdk::{pubkey::Pubkey, signature::Signer};
use std::{collections::HashMap, sync::Arc};

/// Agent replication template
#[derive(Debug, Clone)]
pub struct ReplicationTemplate {
    /// Template ID
    pub id: String,
    /// Agent name
    pub name: String,
    /// Agent description
    pub description: String,
    /// Base capabilities
    pub base_capabilities: u64,
    /// Configuration data
    pub config_data: Vec<u8>,
    /// Template version
    pub version: String,
    /// Creator public key
    pub creator: Pubkey,
    /// Template price (lamports)
    pub price: u64,
    /// Is publicly available
    pub is_public: bool,
}

/// Agent replication record
#[derive(Debug, Clone)]
pub struct ReplicationRecord {
    /// Original agent public key
    pub original_agent: Pubkey,
    /// Replicated agent public key
    pub replicated_agent: Pubkey,
    /// Replication timestamp
    pub timestamp: i64,
    /// Replication signature
    pub signature: String,
    /// Customizations applied
    pub customizations: Vec<AgentCustomization>,
    /// Replication fee paid
    pub fee_paid: u64,
}

/// Agent customization
#[derive(Debug, Clone)]
pub struct AgentCustomization {
    /// Customization type
    pub customization_type: CustomizationType,
    /// Parameter name
    pub parameter: String,
    /// New value
    pub value: String,
    /// Applied successfully
    pub applied: bool,
}

/// Types of customizations
#[derive(Debug, Clone)]
pub enum CustomizationType {
    /// Behavior modification
    Behavior,
    /// Capability enhancement
    Capability,
    /// Configuration change
    Configuration,
    /// Appearance modification
    Appearance,
    /// Memory adjustment
    Memory,
    /// Learning parameters
    Learning,
}

/// Replication configuration
#[derive(Debug, Clone)]
pub struct ReplicationConfig {
    /// Allow public replication
    pub allow_public_replication: bool,
    /// Replication fee (lamports)
    pub replication_fee: u64,
    /// Maximum replications allowed
    pub max_replications: Option<u32>,
    /// Required capabilities for replication
    pub required_capabilities: u64,
    /// Custom parameters
    pub custom_parameters: HashMap<String, String>,
}

/// Agent Replication Service
pub struct AgentReplicationService {
    client: Arc<PodAIClient>,
}

impl AgentReplicationService {
    /// Create new agent replication service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Create a replication template
    pub async fn create_template<T: Signer>(
        &self,
        _signer: &T,
        agent_address: &Pubkey,
        template_name: &str,
        description: &str,
        price: u64,
        is_public: bool,
    ) -> PodAIResult<ReplicationTemplate> {
        println!("📋 Creating replication template for agent: {}", agent_address);

        // Simulate template creation
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        let template = ReplicationTemplate {
            id: format!("template_{}", chrono::Utc::now().timestamp()),
            name: template_name.to_string(),
            description: description.to_string(),
            base_capabilities: 0xFF, // All capabilities
            config_data: vec![1, 2, 3, 4], // Simulated config
            version: "1.0.0".to_string(),
            creator: *agent_address,
            price,
            is_public,
        };

        println!("✅ Template created: {}", template.id);
        Ok(template)
    }

    /// Replicate an agent from a template
    pub async fn replicate_agent<T: Signer>(
        &self,
        _signer: &T,
        template: &ReplicationTemplate,
        customizations: &[AgentCustomization],
        config: &ReplicationConfig,
    ) -> PodAIResult<ReplicationRecord> {
        println!("🔄 Replicating agent from template: {}", template.id);

        // Simulate replication process
        tokio::time::sleep(tokio::time::Duration::from_millis(2500)).await;

        let replicated_agent = Pubkey::new_unique();
        let signature = format!("sig_replication_{}", chrono::Utc::now().timestamp());

        let record = ReplicationRecord {
            original_agent: template.creator,
            replicated_agent,
            timestamp: chrono::Utc::now().timestamp(),
            signature,
            customizations: customizations.to_vec(),
            fee_paid: config.replication_fee,
        };

        println!("✅ Agent replicated: {}", replicated_agent);
        Ok(record)
    }

    /// List available public templates
    pub async fn list_public_templates(&self) -> PodAIResult<Vec<ReplicationTemplate>> {
        println!("📋 Listing public replication templates");

        // Simulate template listing
        let templates = vec![
            ReplicationTemplate {
                id: "template_assistant_1".to_string(),
                name: "Assistant Agent".to_string(),
                description: "General purpose assistant agent".to_string(),
                base_capabilities: 0x01, // Basic communication
                config_data: vec![1, 2, 3],
                version: "1.0.0".to_string(),
                creator: Pubkey::new_unique(),
                price: 5000000, // 0.005 SOL
                is_public: true,
            },
        ];

        Ok(templates)
    }

    /// Calculate replication cost
    pub fn calculate_replication_cost(
        &self,
        template: &ReplicationTemplate,
        customizations: &[AgentCustomization],
    ) -> u64 {
        let mut cost = template.price;
        
        // Add cost for each customization
        for _customization in customizations {
            cost += 100000; // 0.0001 SOL per customization
        }
        
        cost
    }
}

impl std::fmt::Display for CustomizationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let name = match self {
            CustomizationType::Behavior => "Behavior",
            CustomizationType::Capability => "Capability", 
            CustomizationType::Configuration => "Configuration",
            CustomizationType::Appearance => "Appearance",
            CustomizationType::Memory => "Memory",
            CustomizationType::Learning => "Learning",
        };
        write!(f, "{}", name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{PodAIConfig, NetworkType};

    #[tokio::test]
    async fn test_template_creation() {
        let config = PodAIConfig::new(NetworkType::Localnet, None, None);
        let client = Arc::new(PodAIClient::new(config).await.unwrap());
        let service = AgentReplicationService::new(client);
        
        let agent_keypair = solana_sdk::signature::Keypair::new();
        let template = service.create_template(
            &agent_keypair,
            &agent_keypair.pubkey(),
            "Test Template",
            "A test template",
            1000000,
            true,
        ).await.unwrap();
        
        assert_eq!(template.name, "Test Template");
        assert_eq!(template.price, 1000000);
        assert!(template.is_public);
    }

    #[test]
    fn test_cost_calculation() {
        let config = PodAIConfig::new(NetworkType::Localnet, None, None);
        let client = Arc::new(futures::executor::block_on(async {
            PodAIClient::new(config).await.unwrap()
        }));
        let service = AgentReplicationService::new(client);
        
        let template = ReplicationTemplate {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: "Test template".to_string(),
            base_capabilities: 0,
            config_data: vec![],
            version: "1.0.0".to_string(),
            creator: Pubkey::new_unique(),
            price: 1000000,
            is_public: true,
        };
        
        let customizations = vec![
            AgentCustomization {
                customization_type: CustomizationType::Behavior,
                parameter: "test".to_string(),
                value: "test".to_string(),
                applied: false,
            }
        ];
        
        let cost = service.calculate_replication_cost(&template, &customizations);
        assert_eq!(cost, 1100000); // 1000000 + 100000
    }
} 