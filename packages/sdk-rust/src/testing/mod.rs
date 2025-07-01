pub mod mocks;
pub mod fixtures;
pub mod integration;
pub mod benchmarks;
pub mod utils;

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use solana_sdk::{
    account::Account,
    clock::Clock,
    epoch_info::EpochInfo,
    hash::Hash,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signature},
    signer::Signer,
    sysvar,
    transaction::Transaction,
};
use solana_test_validator::{TestValidator, TestValidatorGenesis};
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

use crate::{
    client::PodAIClient,
    errors::{PodAIError, PodAIResult},
    types::agent::AgentAccount,
};

/// Test environment configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestConfig {
    /// Use local test validator
    pub use_test_validator: bool,
    /// RPC URL for testing (if not using test validator)
    pub rpc_url: Option<String>,
    /// Enable verbose logging during tests
    pub verbose_logging: bool,
    /// Number of pre-funded test accounts to create
    pub test_accounts: u32,
    /// Initial balance for test accounts in SOL
    pub initial_balance_sol: f64,
    /// Enable performance benchmarking
    pub enable_benchmarks: bool,
    /// Timeout for test operations in seconds
    pub timeout_secs: u64,
}

impl Default for TestConfig {
    fn default() -> Self {
        Self {
            use_test_validator: true,
            rpc_url: None,
            verbose_logging: false,
            test_accounts: 10,
            initial_balance_sol: 100.0,
            enable_benchmarks: false,
            timeout_secs: 30,
        }
    }
}

/// Test environment manager
pub struct TestEnvironment {
    config: TestConfig,
    validator: Option<TestValidator>,
    client: Option<Arc<PodAIClient>>,
    test_accounts: Vec<TestAccount>,
    program_accounts: HashMap<String, Pubkey>,
    fixtures: Arc<RwLock<TestFixtures>>,
}

impl TestEnvironment {
    /// Create a new test environment
    pub async fn new(config: Option<TestConfig>) -> PodAIResult<Self> {
        let config = config.unwrap_or_default();
        
        if config.verbose_logging {
            tracing_subscriber::fmt::init();
        }

        Ok(Self {
            config,
            validator: None,
            client: None,
            test_accounts: Vec::new(),
            program_accounts: HashMap::new(),
            fixtures: Arc::new(RwLock::new(TestFixtures::new())),
        })
    }

    /// Initialize the test environment
    pub async fn initialize(&mut self) -> PodAIResult<()> {
        info!("Initializing test environment");

        if self.config.use_test_validator {
            self.setup_test_validator().await?;
        } else {
            self.setup_external_rpc().await?;
        }

        self.setup_test_accounts().await?;
        self.setup_program_accounts().await?;

        info!("Test environment initialized successfully");
        Ok(())
    }

    /// Setup local test validator
    async fn setup_test_validator(&mut self) -> PodAIResult<()> {
        info!("Setting up test validator");

        let mut genesis = TestValidatorGenesis::default();
        
        // Add program deployments
        genesis.add_program("ghostspeak", crate::PROGRAM_ID);
        
        // Add system accounts with funding
        genesis.add_account(
            sysvar::clock::id(),
            Account {
                lamports: 1_000_000,
                owner: solana_sdk::system_program::id(),
                executable: false,
                rent_epoch: 0,
                data: bincode::serialize(&Clock::default()).unwrap(),
            },
        );

        let validator = TestValidator::with_no_fees(
            solana_sdk::system_program::id(),
            &genesis,
        );

        let rpc_url = validator.rpc_url();
        self.validator = Some(validator);

        // Create client connected to test validator
        let client = PodAIClient::new_with_rpc_url(&rpc_url).await?;
        self.client = Some(Arc::new(client));

        Ok(())
    }

    /// Setup external RPC connection
    async fn setup_external_rpc(&mut self) -> PodAIResult<()> {
        let rpc_url = self.config.rpc_url
            .as_ref()
            .ok_or_else(|| PodAIError::Configuration {
                message: "RPC URL required when not using test validator".to_string(),
            })?;

        info!("Connecting to external RPC: {}", rpc_url);

        let client = PodAIClient::new_with_rpc_url(rpc_url).await?;
        self.client = Some(Arc::new(client));

        Ok(())
    }

    /// Setup test accounts with funding
    async fn setup_test_accounts(&mut self) -> PodAIResult<()> {
        info!("Setting up {} test accounts", self.config.test_accounts);

        let client = self.client.as_ref().unwrap();
        let lamports_per_sol = 1_000_000_000;
        let funding_amount = (self.config.initial_balance_sol * lamports_per_sol as f64) as u64;

        for i in 0..self.config.test_accounts {
            let keypair = Keypair::new();
            
            // Fund the account (only works with test validator)
            if self.config.use_test_validator {
                client.request_airdrop(&keypair.pubkey(), funding_amount).await?;
            }

            let test_account = TestAccount {
                id: i,
                keypair,
                initial_balance: funding_amount,
                role: TestAccountRole::General,
            };

            self.test_accounts.push(test_account);
        }

        // Designate special role accounts
        if !self.test_accounts.is_empty() {
            self.test_accounts[0].role = TestAccountRole::Authority;
            if self.test_accounts.len() > 1 {
                self.test_accounts[1].role = TestAccountRole::Agent;
            }
            if self.test_accounts.len() > 2 {
                self.test_accounts[2].role = TestAccountRole::User;
            }
        }

        Ok(())
    }

    /// Setup program-specific accounts
    async fn setup_program_accounts(&mut self) -> PodAIResult<()> {
        info!("Setting up program accounts");

        // Add known program IDs
        self.program_accounts.insert("ghostspeak".to_string(), crate::PROGRAM_ID);
        self.program_accounts.insert("system".to_string(), solana_sdk::system_program::id());
        self.program_accounts.insert("spl_token".to_string(), spl_token::id());
        self.program_accounts.insert("spl_token_2022".to_string(), spl_token_2022::id());

        Ok(())
    }

    /// Get a test account by role
    pub fn get_account_by_role(&self, role: TestAccountRole) -> Option<&TestAccount> {
        self.test_accounts.iter().find(|acc| acc.role == role)
    }

    /// Get a test account by index
    pub fn get_account(&self, index: usize) -> Option<&TestAccount> {
        self.test_accounts.get(index)
    }

    /// Get the test client
    pub fn client(&self) -> Arc<PodAIClient> {
        self.client.as_ref().unwrap().clone()
    }

    /// Get program ID by name
    pub fn program_id(&self, name: &str) -> Option<Pubkey> {
        self.program_accounts.get(name).copied()
    }

    /// Create test fixtures
    pub async fn create_fixtures(&self) -> PodAIResult<()> {
        info!("Creating test fixtures");

        let mut fixtures = self.fixtures.write().await;
        
        // Create agent fixtures
        if let Some(agent_account) = self.get_account_by_role(TestAccountRole::Agent) {
            fixtures.create_agent_fixture(&agent_account.keypair).await?;
        }

        // Create more fixtures as needed
        // fixtures.create_channel_fixtures().await?;
        // fixtures.create_marketplace_fixtures().await?;

        Ok(())
    }

    /// Run a test with timeout
    pub async fn run_test<F, Fut>(&self, test_name: &str, test_fn: F) -> PodAIResult<()>
    where
        F: FnOnce(Arc<PodAIClient>) -> Fut,
        Fut: std::future::Future<Output = PodAIResult<()>>,
    {
        info!("Running test: {}", test_name);

        let timeout = Duration::from_secs(self.config.timeout_secs);
        let client = self.client();

        tokio::time::timeout(timeout, test_fn(client))
            .await
            .map_err(|_| PodAIError::Timeout {
                duration_ms: self.config.timeout_secs * 1000,
            })?
    }

    /// Clean up test environment
    pub async fn cleanup(&mut self) -> PodAIResult<()> {
        info!("Cleaning up test environment");

        if let Some(validator) = self.validator.take() {
            // Test validator will be dropped automatically
            drop(validator);
        }

        self.test_accounts.clear();
        self.program_accounts.clear();

        Ok(())
    }
}

/// Test account with metadata
#[derive(Debug, Clone)]
pub struct TestAccount {
    pub id: u32,
    pub keypair: Keypair,
    pub initial_balance: u64,
    pub role: TestAccountRole,
}

impl TestAccount {
    pub fn pubkey(&self) -> Pubkey {
        self.keypair.pubkey()
    }

    pub fn as_signer(&self) -> &dyn Signer {
        &self.keypair
    }
}

/// Test account roles
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TestAccountRole {
    Authority,
    Agent,
    User,
    General,
}

/// Test fixtures for common test data
pub struct TestFixtures {
    pub agents: Vec<TestAgentFixture>,
    pub channels: Vec<TestChannelFixture>,
    pub messages: Vec<TestMessageFixture>,
}

impl TestFixtures {
    fn new() -> Self {
        Self {
            agents: Vec::new(),
            channels: Vec::new(),
            messages: Vec::new(),
        }
    }

    async fn create_agent_fixture(&mut self, keypair: &Keypair) -> PodAIResult<()> {
        let fixture = TestAgentFixture {
            keypair: keypair.clone(),
            capabilities: 0b1111, // All capabilities for testing
            metadata_uri: "https://test.example.com/agent.json".to_string(),
            reputation: 100,
        };

        self.agents.push(fixture);
        Ok(())
    }
}

/// Test agent fixture
#[derive(Debug, Clone)]
pub struct TestAgentFixture {
    pub keypair: Keypair,
    pub capabilities: u64,
    pub metadata_uri: String,
    pub reputation: u64,
}

/// Test channel fixture
#[derive(Debug, Clone)]
pub struct TestChannelFixture {
    pub channel_id: Pubkey,
    pub participants: Vec<Pubkey>,
    pub created_at: u64,
}

/// Test message fixture
#[derive(Debug, Clone)]
pub struct TestMessageFixture {
    pub message_id: Pubkey,
    pub channel_id: Pubkey,
    pub sender: Pubkey,
    pub content: String,
    pub timestamp: u64,
}

/// Mock services for testing
pub mod mock_services {
    use super::*;

    /// Mock client for testing without network calls
    pub struct MockPodAIClient {
        accounts: HashMap<Pubkey, Account>,
        transactions: Vec<Transaction>,
        current_slot: u64,
    }

    impl MockPodAIClient {
        pub fn new() -> Self {
            Self {
                accounts: HashMap::new(),
                transactions: Vec::new(),
                current_slot: 0,
            }
        }

        pub fn add_account(&mut self, pubkey: Pubkey, account: Account) {
            self.accounts.insert(pubkey, account);
        }

        pub fn get_account(&self, pubkey: &Pubkey) -> Option<&Account> {
            self.accounts.get(pubkey)
        }

        pub fn add_transaction(&mut self, transaction: Transaction) {
            self.transactions.push(transaction);
        }

        pub fn transaction_count(&self) -> usize {
            self.transactions.len()
        }

        pub fn advance_slot(&mut self, slots: u64) {
            self.current_slot += slots;
        }
    }
}

/// Test assertion utilities
pub mod assertions {
    use super::*;

    /// Assert that an account exists and has expected properties
    pub async fn assert_account_exists(
        client: &PodAIClient,
        pubkey: &Pubkey,
        expected_owner: Option<Pubkey>,
    ) -> PodAIResult<Account> {
        let account = client.get_account(pubkey).await
            .map_err(|_| PodAIError::Custom {
                message: format!("Account {} does not exist", pubkey),
            })?;

        if let Some(expected_owner) = expected_owner {
            if account.owner != expected_owner {
                return Err(PodAIError::Custom {
                    message: format!(
                        "Account {} has wrong owner. Expected: {}, Actual: {}",
                        pubkey, expected_owner, account.owner
                    ),
                });
            }
        }

        Ok(account)
    }

    /// Assert that a transaction was successful
    pub async fn assert_transaction_success(
        client: &PodAIClient,
        signature: &Signature,
    ) -> PodAIResult<()> {
        let status = client.get_signature_status(signature).await
            .map_err(|e| PodAIError::Custom {
                message: format!("Failed to get transaction status: {}", e),
            })?;

        match status {
            Some(Ok(())) => Ok(()),
            Some(Err(e)) => Err(PodAIError::Custom {
                message: format!("Transaction failed: {}", e),
            }),
            None => Err(PodAIError::Custom {
                message: "Transaction not found".to_string(),
            }),
        }
    }

    /// Assert that an agent has expected properties
    pub fn assert_agent_properties(
        agent: &AgentAccount,
        expected_capabilities: u64,
        expected_metadata_uri: &str,
    ) -> PodAIResult<()> {
        if agent.capabilities != expected_capabilities {
            return Err(PodAIError::Custom {
                message: format!(
                    "Agent capabilities mismatch. Expected: {}, Actual: {}",
                    expected_capabilities, agent.capabilities
                ),
            });
        }

        if agent.metadata_uri != expected_metadata_uri {
            return Err(PodAIError::Custom {
                message: format!(
                    "Agent metadata URI mismatch. Expected: {}, Actual: {}",
                    expected_metadata_uri, agent.metadata_uri
                ),
            });
        }

        Ok(())
    }
}

/// Performance benchmarking utilities
pub mod benchmarks {
    use super::*;
    use std::time::Instant;

    /// Benchmark a function execution
    pub async fn benchmark<F, Fut, T>(
        name: &str,
        iterations: u32,
        f: F,
    ) -> BenchmarkResult<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = T>,
    {
        let mut times = Vec::new();
        let mut results = Vec::new();

        for _ in 0..iterations {
            let start = Instant::now();
            let result = f().await;
            let duration = start.elapsed();
            
            times.push(duration);
            results.push(result);
        }

        let total_time: Duration = times.iter().sum();
        let avg_time = total_time / iterations;
        let min_time = times.iter().min().unwrap();
        let max_time = times.iter().max().unwrap();

        info!(
            "Benchmark '{}' - {} iterations, avg: {:?}, min: {:?}, max: {:?}",
            name, iterations, avg_time, min_time, max_time
        );

        BenchmarkResult {
            name: name.to_string(),
            iterations,
            results,
            times,
            avg_time,
            min_time: *min_time,
            max_time: *max_time,
            total_time,
        }
    }

    #[derive(Debug)]
    pub struct BenchmarkResult<T> {
        pub name: String,
        pub iterations: u32,
        pub results: Vec<T>,
        pub times: Vec<Duration>,
        pub avg_time: Duration,
        pub min_time: Duration,
        pub max_time: Duration,
        pub total_time: Duration,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_environment_setup() {
        let mut env = TestEnvironment::new(None).await.unwrap();
        env.initialize().await.unwrap();
        
        assert!(env.client.is_some());
        assert!(!env.test_accounts.is_empty());
        assert!(env.program_accounts.contains_key("ghostspeak"));
        
        env.cleanup().await.unwrap();
    }

    #[tokio::test]
    async fn test_account_roles() {
        let mut env = TestEnvironment::new(Some(TestConfig {
            test_accounts: 5,
            ..Default::default()
        })).await.unwrap();
        
        env.initialize().await.unwrap();
        
        let authority = env.get_account_by_role(TestAccountRole::Authority);
        assert!(authority.is_some());
        
        let agent = env.get_account_by_role(TestAccountRole::Agent);
        assert!(agent.is_some());
        
        env.cleanup().await.unwrap();
    }

    #[test]
    fn test_mock_client() {
        let mut mock = mock_services::MockPodAIClient::new();
        
        let pubkey = Pubkey::default();
        let account = Account {
            lamports: 1000,
            owner: solana_sdk::system_program::id(),
            executable: false,
            rent_epoch: 0,
            data: vec![],
        };
        
        mock.add_account(pubkey, account);
        assert!(mock.get_account(&pubkey).is_some());
        assert_eq!(mock.get_account(&pubkey).unwrap().lamports, 1000);
    }
} 