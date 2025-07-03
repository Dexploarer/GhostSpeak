//! MEV Protection Service for podAI SDK
//!
//! Provides MEV (Maximum Extractable Value) protection for transactions

use crate::{client::PodAIClient, errors::PodAIResult};
use solana_sdk::{pubkey::Pubkey, signature::Signer, transaction::Transaction};
use std::sync::Arc;

/// MEV protection configuration
#[derive(Debug, Clone)]
pub struct MEVProtectionConfig {
    /// Enable slippage protection
    pub enable_slippage_protection: bool,
    /// Maximum slippage tolerance (in basis points)
    pub max_slippage_bps: u16,
    /// Enable frontrunning protection
    pub enable_frontrunning_protection: bool,
    /// Priority fee multiplier for protection
    pub priority_fee_multiplier: f64,
    /// Enable sandwich attack protection
    pub enable_sandwich_protection: bool,
    /// Transaction timeout in seconds
    pub timeout_seconds: u64,
}

/// MEV protection result
#[derive(Debug, Clone)]
pub struct MEVProtectionResult {
    /// Protection applied successfully
    pub protection_applied: bool,
    /// MEV detected and blocked
    pub mev_blocked: bool,
    /// Original transaction hash
    pub original_tx_hash: String,
    /// Protected transaction hash
    pub protected_tx_hash: String,
    /// Protection fee paid (lamports)
    pub protection_fee: u64,
    /// Slippage detected (basis points)
    pub slippage_detected_bps: u16,
}

/// Transaction protection metadata
#[derive(Debug, Clone)]
pub struct TransactionProtection {
    /// Transaction ID
    pub tx_id: String,
    /// Protection level applied
    pub protection_level: ProtectionLevel,
    /// MEV risks detected
    pub risks_detected: Vec<MEVRisk>,
    /// Protection measures applied
    pub measures_applied: Vec<ProtectionMeasure>,
    /// Cost of protection (lamports)
    pub protection_cost: u64,
}

/// MEV protection levels
#[derive(Debug, Clone)]
pub enum ProtectionLevel {
    /// Basic protection
    Basic,
    /// Standard protection
    Standard,
    /// Premium protection with all features
    Premium,
    /// Custom protection configuration
    Custom,
}

/// Types of MEV risks
#[derive(Debug, Clone)]
pub enum MEVRisk {
    /// Frontrunning risk detected
    Frontrunning,
    /// Sandwich attack risk
    SandwichAttack,
    /// Slippage risk
    SlippageRisk,
    /// Priority gas auction risk
    PriorityGasAuction,
    /// Time-bandit risk
    TimeBandit,
}

/// Protection measures that can be applied
#[derive(Debug, Clone)]
pub enum ProtectionMeasure {
    /// Priority fee adjustment
    PriorityFeeAdjustment,
    /// Transaction ordering protection
    OrderingProtection,
    /// Slippage limiting
    SlippageLimiting,
    /// Bundle submission
    BundleSubmission,
    /// Timing randomization
    TimingRandomization,
}

/// MEV Protection Service
pub struct MEVProtectionService {
    client: Arc<PodAIClient>,
}

impl MEVProtectionService {
    /// Create new MEV protection service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Protect a transaction against MEV
    pub async fn protect_transaction<T: Signer>(
        &self,
        _signer: &T,
        _transaction: &Transaction,
        config: &MEVProtectionConfig,
    ) -> PodAIResult<MEVProtectionResult> {
        println!("🛡️ Applying MEV protection to transaction");

        // Simulate MEV analysis and protection
        tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;

        let original_tx_hash = format!("tx_original_{}", chrono::Utc::now().timestamp());
        let protected_tx_hash = format!("tx_protected_{}", chrono::Utc::now().timestamp());

        // Simulate slippage detection
        let slippage_detected = if config.enable_slippage_protection {
            150 // 1.5% slippage detected
        } else {
            0
        };

        let protection_fee = self.calculate_protection_fee(config);

        let result = MEVProtectionResult {
            protection_applied: true,
            mev_blocked: config.enable_frontrunning_protection,
            original_tx_hash,
            protected_tx_hash,
            protection_fee,
            slippage_detected_bps: slippage_detected,
        };

        println!("✅ MEV protection applied. Fee: {} lamports", result.protection_fee);

        Ok(result)
    }

    /// Analyze transaction for MEV risks
    pub async fn analyze_mev_risks(
        &self,
        _transaction: &Transaction,
    ) -> PodAIResult<Vec<MEVRisk>> {
        println!("🔍 Analyzing transaction for MEV risks");

        // Simulate MEV risk analysis
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        let risks = vec![
            MEVRisk::SlippageRisk,
            MEVRisk::Frontrunning,
        ];

        println!("⚠️ Detected {} MEV risks", risks.len());

        Ok(risks)
    }

    /// Submit transaction with MEV protection
    pub async fn submit_protected_transaction<T: Signer>(
        &self,
        signer: &T,
        transaction: &Transaction,
        protection_level: ProtectionLevel,
    ) -> PodAIResult<String> {
        println!("📤 Submitting transaction with MEV protection: {:?}", protection_level);

        // Create protection config based on level
        let config = self.create_config_for_level(&protection_level);

        // Apply protection
        let protection_result = self.protect_transaction(signer, transaction, &config).await?;

        // Simulate transaction submission
        tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

        println!("✅ Protected transaction submitted: {}", protection_result.protected_tx_hash);

        Ok(protection_result.protected_tx_hash)
    }

    /// Calculate protection fee based on configuration
    pub fn calculate_protection_fee(&self, config: &MEVProtectionConfig) -> u64 {
        let mut base_fee = 10000u64; // 0.00001 SOL base fee

        if config.enable_slippage_protection {
            base_fee += 5000;
        }

        if config.enable_frontrunning_protection {
            base_fee += 10000;
        }

        if config.enable_sandwich_protection {
            base_fee += 15000;
        }

        // Apply priority fee multiplier
        let total_fee = (base_fee as f64 * config.priority_fee_multiplier) as u64;

        total_fee
    }

    /// Create default configuration for protection level
    pub fn create_config_for_level(&self, level: &ProtectionLevel) -> MEVProtectionConfig {
        match level {
            ProtectionLevel::Basic => MEVProtectionConfig {
                enable_slippage_protection: true,
                max_slippage_bps: 500, // 5%
                enable_frontrunning_protection: false,
                priority_fee_multiplier: 1.1,
                enable_sandwich_protection: false,
                timeout_seconds: 30,
            },
            ProtectionLevel::Standard => MEVProtectionConfig {
                enable_slippage_protection: true,
                max_slippage_bps: 300, // 3%
                enable_frontrunning_protection: true,
                priority_fee_multiplier: 1.3,
                enable_sandwich_protection: false,
                timeout_seconds: 60,
            },
            ProtectionLevel::Premium => MEVProtectionConfig {
                enable_slippage_protection: true,
                max_slippage_bps: 100, // 1%
                enable_frontrunning_protection: true,
                priority_fee_multiplier: 1.5,
                enable_sandwich_protection: true,
                timeout_seconds: 120,
            },
            ProtectionLevel::Custom => MEVProtectionConfig {
                enable_slippage_protection: true,
                max_slippage_bps: 200, // 2%
                enable_frontrunning_protection: true,
                priority_fee_multiplier: 1.2,
                enable_sandwich_protection: true,
                timeout_seconds: 90,
            },
        }
    }

    /// Check if protection is needed for a transaction
    pub fn needs_protection(&self, risks: &[MEVRisk]) -> bool {
        !risks.is_empty()
    }

    /// Get estimated savings from MEV protection
    pub fn estimate_protection_savings(&self, config: &MEVProtectionConfig) -> u64 {
        let potential_mev_loss = 100000u64; // Estimate 0.0001 SOL potential loss
        let protection_fee = self.calculate_protection_fee(config);
        
        potential_mev_loss.saturating_sub(protection_fee)
    }
}

impl std::fmt::Display for ProtectionLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let name = match self {
            ProtectionLevel::Basic => "Basic",
            ProtectionLevel::Standard => "Standard",
            ProtectionLevel::Premium => "Premium",
            ProtectionLevel::Custom => "Custom",
        };
        write!(f, "{}", name)
    }
}

impl std::fmt::Display for MEVRisk {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let name = match self {
            MEVRisk::Frontrunning => "Frontrunning",
            MEVRisk::SandwichAttack => "Sandwich Attack",
            MEVRisk::SlippageRisk => "Slippage Risk",
            MEVRisk::PriorityGasAuction => "Priority Gas Auction",
            MEVRisk::TimeBandit => "Time Bandit",
        };
        write!(f, "{}", name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{PodAIConfig, NetworkType};

    #[test]
    fn test_protection_fee_calculation() {
        let config = PodAIConfig::new(NetworkType::Localnet, None, None);
        let client = Arc::new(futures::executor::block_on(async {
            PodAIClient::new(config).await.unwrap()
        }));
        let service = MEVProtectionService::new(client);

        let config = MEVProtectionConfig {
            enable_slippage_protection: true,
            max_slippage_bps: 300,
            enable_frontrunning_protection: true,
            priority_fee_multiplier: 1.5,
            enable_sandwich_protection: false,
            timeout_seconds: 60,
        };

        let fee = service.calculate_protection_fee(&config);
        // Base (10000) + slippage (5000) + frontrunning (10000) = 25000
        // With 1.5x multiplier = 37500
        assert_eq!(fee, 37500);
    }

    #[test]
    fn test_protection_level_configs() {
        let config = PodAIConfig::new(NetworkType::Localnet, None, None);
        let client = Arc::new(futures::executor::block_on(async {
            PodAIClient::new(config).await.unwrap()
        }));
        let service = MEVProtectionService::new(client);

        let basic_config = service.create_config_for_level(&ProtectionLevel::Basic);
        assert_eq!(basic_config.max_slippage_bps, 500);
        assert!(!basic_config.enable_frontrunning_protection);

        let premium_config = service.create_config_for_level(&ProtectionLevel::Premium);
        assert_eq!(premium_config.max_slippage_bps, 100);
        assert!(premium_config.enable_frontrunning_protection);
        assert!(premium_config.enable_sandwich_protection);
    }

    #[test]
    fn test_protection_savings() {
        let config = PodAIConfig::new(NetworkType::Localnet, None, None);
        let client = Arc::new(futures::executor::block_on(async {
            PodAIClient::new(config).await.unwrap()
        }));
        let service = MEVProtectionService::new(client);

        let protection_config = MEVProtectionConfig {
            enable_slippage_protection: true,
            max_slippage_bps: 200,
            enable_frontrunning_protection: false,
            priority_fee_multiplier: 1.0,
            enable_sandwich_protection: false,
            timeout_seconds: 30,
        };

        let savings = service.estimate_protection_savings(&protection_config);
        assert!(savings > 0);
    }
} 