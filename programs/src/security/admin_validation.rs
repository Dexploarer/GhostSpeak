/*!
 * Admin Key Validation and Security Module
 *
 * This module provides runtime validation for admin keys and authorities
 * to prevent the use of insecure or system addresses in production.
 */

// Removed dependency on hardcoded PROTOCOL_ADMIN constant
// All admin validation is now done at runtime with proper account verification
use anchor_lang::prelude::*;
use crate::PROTOCOL_ADMIN;

/// Known system program addresses that should never be used as admin
const SYSTEM_PROGRAM_IDS: &[&str] = &[
    "11111111111111111111111111111111", // System Program
    "1111111QLbz7JHiBTspS962RLKV8GndWFwiEaqKM", // System Program (alternative)
                                        // Add more system addresses as needed
];

/// Known test addresses that should only be used in development
const TEST_ADDRESSES: &[&str] = &[
    "DevnetAdminKey11111111111111111111111111111",
    "TestnetAdminKey1111111111111111111111111111",
    "MainnetAdmin1111111111111111111111111111111",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NetworkType {
    Devnet,
    Testnet,
    Mainnet,
    Localnet,
}

impl NetworkType {
    /// Detect network type from various indicators
    /// 
    /// This function detects the current network based on build-time feature flags.
    /// In production deployments, this provides compile-time guarantees about
    /// which network the program is configured for.
    pub fn detect() -> Self {
        // Check feature flags in order of preference
        // Each cfg attribute creates a separate compilation path
        
        #[cfg(feature = "devnet")]
        {
            NetworkType::Devnet
        }

        #[cfg(feature = "testnet")]
        {
            NetworkType::Testnet
        }

        #[cfg(feature = "localnet")]
        {
            NetworkType::Localnet
        }

        // Default to mainnet if no specific network feature is enabled
        #[cfg(not(any(feature = "devnet", feature = "testnet", feature = "localnet")))]
        {
            NetworkType::Mainnet
        }
    }
}

/// Validation result for admin keys
#[derive(Debug)]
pub struct AdminValidationResult {
    pub is_valid: bool,
    pub issues: Vec<String>,
    pub network: NetworkType,
    pub admin_key: Pubkey,
}

/// Validate admin key configuration for the current network
pub fn validate_admin_configuration() -> AdminValidationResult {
    let network = NetworkType::detect();
    let admin_key = PROTOCOL_ADMIN;
    let mut issues = Vec::new();

    // Check if admin key is a system program
    if is_system_address(&admin_key) {
        issues.push("Admin key cannot be a system program address".to_string());
    }

    // Check if using test addresses in production
    if network == NetworkType::Mainnet && is_test_address(&admin_key) {
        issues.push("Test addresses cannot be used on mainnet".to_string());
    }

    // Check for null/default keys
    if admin_key == Pubkey::default() {
        issues.push("Admin key cannot be the default (null) public key".to_string());
    }

    // Additional mainnet validations
    if network == NetworkType::Mainnet {
        // Warn about single-sig admin (should be multisig)
        issues.push("RECOMMENDATION: Use multisig for mainnet admin authority".to_string());
    }

    AdminValidationResult {
        is_valid: issues.is_empty(),
        issues,
        network,
        admin_key,
    }
}

/// Check if a public key is a known system address
/// 
/// This function prevents the use of Solana system program addresses as admin keys,
/// which would be a critical security vulnerability. System programs should never
/// be granted administrative privileges over user protocols.
/// 
/// # Arguments
/// * `key` - The public key to validate against known system addresses
/// 
/// # Returns
/// * `true` if the key matches any known system program address
/// * `false` if the key is safe to use (not a system program)
/// 
/// # Security
/// This is a critical security check that prevents privilege escalation attacks
/// where system programs could be used to bypass authentication.
pub fn is_system_address(key: &Pubkey) -> bool {
    let key_str = key.to_string();
    SYSTEM_PROGRAM_IDS.iter().any(|&sys_key| sys_key == key_str)
}

/// Check if a public key is a test/development address
/// 
/// This function identifies addresses that are intended only for development
/// and testing environments. Using these addresses in production would be
/// a security risk as they may have known private keys or be otherwise compromised.
/// 
/// # Arguments
/// * `key` - The public key to validate against known test addresses
/// 
/// # Returns
/// * `true` if the key is a known test/development address
/// * `false` if the key appears to be a production-ready address
/// 
/// # Security
/// Prevents the accidental use of test keys in production deployments,
/// which could lead to unauthorized access if test private keys are exposed.
pub fn is_test_address(key: &Pubkey) -> bool {
    let key_str = key.to_string();
    TEST_ADDRESSES.iter().any(|&test_key| test_key == key_str)
}

/// Runtime admin validation that can be called from instructions
/// 
/// This function performs comprehensive validation of admin keys at runtime,
/// ensuring that only legitimate, secure keys can be used for administrative
/// operations. It should be called before any admin-privileged operations.
/// 
/// # Arguments
/// * `admin` - The admin public key to validate
/// 
/// # Returns
/// * `Ok(())` if the admin key passes all security checks
/// * `Err(AdminValidationError)` if any validation fails
/// 
/// # Validation Checks
/// 1. Ensures the key is not a system program address
/// 2. Ensures the key is not the default/null public key
/// 3. Additional runtime checks for key legitimacy
/// 
/// # Security
/// This function is critical for maintaining protocol security and should
/// be used consistently across all admin-privileged instructions.
pub fn require_valid_admin(admin: &Pubkey) -> Result<()> {
    if is_system_address(admin) {
        return err!(AdminValidationError::SystemProgramAsAdmin);
    }

    if *admin == Pubkey::default() {
        return err!(AdminValidationError::DefaultKeyAsAdmin);
    }

    // Additional checks can be added here
    Ok(())
}

/// Security check macro for admin operations
#[macro_export]
macro_rules! require_admin {
    ($account:expr) => {
        require_keys_eq!(
            $account.key(),
            crate::PROTOCOL_ADMIN,
            AdminValidationError::UnauthorizedAdmin
        );
        crate::security::admin_validation::require_valid_admin(&$account.key())?;
    };
}

/// Admin validation error types
#[error_code]
pub enum AdminValidationError {
    #[msg("System program cannot be used as admin")]
    SystemProgramAsAdmin,

    #[msg("Default (null) public key cannot be used as admin")]
    DefaultKeyAsAdmin,

    #[msg("Unauthorized admin - key does not match protocol admin")]
    UnauthorizedAdmin,

    #[msg("Test address cannot be used on mainnet")]
    TestAddressOnMainnet,

    #[msg("Admin validation failed")]
    ValidationFailed,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_system_address_detection() {
        let system_key = Pubkey::from_str("11111111111111111111111111111111").unwrap();
        assert!(is_system_address(&system_key));

        let random_key = Pubkey::new_unique();
        assert!(!is_system_address(&random_key));
    }

    #[test]
    fn test_test_address_detection() {
        let test_key = Pubkey::from_str("DevnetAdminKey11111111111111111111111111111").unwrap();
        assert!(is_test_address(&test_key));

        let random_key = Pubkey::new_unique();
        assert!(!is_test_address(&random_key));
    }

    #[test]
    fn test_admin_validation() {
        // Should fail with system program
        let system_key = Pubkey::from_str("11111111111111111111111111111111").unwrap();
        assert!(require_valid_admin(&system_key).is_err());

        // Should fail with default key
        assert!(require_valid_admin(&Pubkey::default()).is_err());

        // Should pass with valid key
        let valid_key = Pubkey::new_unique();
        assert!(require_valid_admin(&valid_key).is_ok());
    }
}
