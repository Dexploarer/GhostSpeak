pub mod input_validation;
pub mod rate_limiting;
pub mod signature_verification;
pub mod account_validation;
pub mod access_control;

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use async_trait::async_trait;
use regex::Regex;
use serde::{Deserialize, Serialize};
use solana_sdk::{
    account::Account,
    pubkey::Pubkey,
    signature::{Keypair, Signature},
    signer::Signer,
};
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

use crate::{
    client::PodAIClient,
    errors::{PodAIError, PodAIResult},
};

/// Security configuration for the SDK
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    /// Enable comprehensive input validation
    pub enable_input_validation: bool,
    /// Enable rate limiting
    pub enable_rate_limiting: bool,
    /// Enable signature verification
    pub enable_signature_verification: bool,
    /// Enable account validation
    pub enable_account_validation: bool,
    /// Maximum allowed operations per minute per client
    pub rate_limit_per_minute: u32,
    /// Timeout for security checks in milliseconds
    pub security_check_timeout_ms: u64,
    /// Enable security logging
    pub enable_security_logging: bool,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            enable_input_validation: true,
            enable_rate_limiting: true,
            enable_signature_verification: true,
            enable_account_validation: true,
            rate_limit_per_minute: 100,
            security_check_timeout_ms: 5000,
            enable_security_logging: true,
        }
    }
}

/// Main security manager for the SDK
pub struct SecurityManager {
    config: SecurityConfig,
    client: Arc<PodAIClient>,
    rate_limiter: Arc<RwLock<RateLimiter>>,
    input_validator: InputValidator,
    signature_verifier: SignatureVerifier,
    account_validator: AccountValidator,
}

impl SecurityManager {
    /// Create a new security manager
    pub fn new(client: Arc<PodAIClient>, config: Option<SecurityConfig>) -> Self {
        let config = config.unwrap_or_default();
        
        Self {
            rate_limiter: Arc::new(RwLock::new(RateLimiter::new(config.rate_limit_per_minute))),
            input_validator: InputValidator::new(),
            signature_verifier: SignatureVerifier::new(client.clone()),
            account_validator: AccountValidator::new(client.clone()),
            client,
            config,
        }
    }

    /// Perform comprehensive security validation
    pub async fn validate_operation(
        &self,
        operation: &SecurityOperation,
    ) -> PodAIResult<SecurityValidationResult> {
        info!("Performing security validation for operation: {}", operation.operation_type);

        let start_time = Instant::now();
        let mut validation_result = SecurityValidationResult {
            operation_id: operation.operation_id.clone(),
            passed: true,
            checks_performed: Vec::new(),
            warnings: Vec::new(),
            execution_time_ms: 0,
        };

        // 1. Rate Limiting Check
        if self.config.enable_rate_limiting {
            let rate_check_start = Instant::now();
            let rate_check = self.check_rate_limit(&operation.client_id).await;
            
            validation_result.checks_performed.push(SecurityCheck {
                check_type: "rate_limiting".to_string(),
                passed: rate_check.is_ok(),
                duration_ms: rate_check_start.elapsed().as_millis() as u64,
                details: if rate_check.is_err() {
                    Some(format!("Rate limit exceeded: {:?}", rate_check.unwrap_err()))
                } else {
                    None
                },
            });

            if rate_check.is_err() {
                validation_result.passed = false;
                return Ok(validation_result);
            }
        }

        // 2. Input Validation
        if self.config.enable_input_validation {
            let input_check_start = Instant::now();
            let input_check = self.input_validator.validate(&operation.inputs).await;
            
            validation_result.checks_performed.push(SecurityCheck {
                check_type: "input_validation".to_string(),
                passed: input_check.is_ok(),
                duration_ms: input_check_start.elapsed().as_millis() as u64,
                details: if let Err(ref e) = input_check {
                    Some(e.to_string())
                } else {
                    None
                },
            });

            if let Err(e) = input_check {
                validation_result.passed = false;
                error!("Input validation failed: {}", e);
                return Ok(validation_result);
            }
        }

        // 3. Signature Verification
        if self.config.enable_signature_verification && operation.signature.is_some() {
            let sig_check_start = Instant::now();
            let sig_check = self.signature_verifier.verify(
                &operation.signature.unwrap(),
                &operation.message,
                &operation.signer_pubkey,
            ).await;
            
            validation_result.checks_performed.push(SecurityCheck {
                check_type: "signature_verification".to_string(),
                passed: sig_check.is_ok(),
                duration_ms: sig_check_start.elapsed().as_millis() as u64,
                details: if let Err(ref e) = sig_check {
                    Some(e.to_string())
                } else {
                    None
                },
            });

            if let Err(e) = sig_check {
                validation_result.passed = false;
                error!("Signature verification failed: {}", e);
                return Ok(validation_result);
            }
        }

        // 4. Account Validation
        if self.config.enable_account_validation {
            let account_check_start = Instant::now();
            let account_check = self.account_validator.validate_accounts(&operation.accounts).await;
            
            validation_result.checks_performed.push(SecurityCheck {
                check_type: "account_validation".to_string(),
                passed: account_check.is_ok(),
                duration_ms: account_check_start.elapsed().as_millis() as u64,
                details: if let Err(ref e) = account_check {
                    Some(e.to_string())
                } else {
                    None
                },
            });

            if let Err(e) = account_check {
                validation_result.passed = false;
                error!("Account validation failed: {}", e);
                return Ok(validation_result);
            }
        }

        validation_result.execution_time_ms = start_time.elapsed().as_millis() as u64;
        
        if self.config.enable_security_logging {
            info!(
                "Security validation completed for operation {} in {}ms",
                operation.operation_id,
                validation_result.execution_time_ms
            );
        }

        Ok(validation_result)
    }

    /// Check rate limit for a client
    async fn check_rate_limit(&self, client_id: &str) -> PodAIResult<()> {
        let mut rate_limiter = self.rate_limiter.write().await;
        
        if rate_limiter.is_allowed(client_id) {
            Ok(())
        } else {
            Err(PodAIError::RateLimitExceeded {
                operation: "general".to_string(),
            })
        }
    }

    /// Validate a metadata URI for security
    pub fn validate_metadata_uri(&self, uri: &str) -> PodAIResult<()> {
        self.input_validator.validate_uri(uri)
    }

    /// Validate agent capabilities
    pub fn validate_agent_capabilities(&self, capabilities: u64) -> PodAIResult<()> {
        self.input_validator.validate_capabilities(capabilities)
    }

    /// Check if a pubkey is in the allowed list (if configured)
    pub async fn is_pubkey_allowed(&self, pubkey: &Pubkey) -> PodAIResult<bool> {
        // Implementation would check against allowlist/blocklist
        // For now, always return true
        Ok(true)
    }
}

/// Security operation definition
#[derive(Debug, Clone)]
pub struct SecurityOperation {
    pub operation_id: String,
    pub operation_type: String,
    pub client_id: String,
    pub signer_pubkey: Pubkey,
    pub signature: Option<Signature>,
    pub message: Vec<u8>,
    pub inputs: HashMap<String, SecurityInput>,
    pub accounts: Vec<Pubkey>,
}

/// Security input types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityInput {
    String(String),
    Number(u64),
    Pubkey(Pubkey),
    Bytes(Vec<u8>),
}

/// Result of security validation
#[derive(Debug, Clone)]
pub struct SecurityValidationResult {
    pub operation_id: String,
    pub passed: bool,
    pub checks_performed: Vec<SecurityCheck>,
    pub warnings: Vec<String>,
    pub execution_time_ms: u64,
}

/// Individual security check result
#[derive(Debug, Clone)]
pub struct SecurityCheck {
    pub check_type: String,
    pub passed: bool,
    pub duration_ms: u64,
    pub details: Option<String>,
}

/// Rate limiter implementation
struct RateLimiter {
    requests: HashMap<String, Vec<Instant>>,
    limit_per_minute: u32,
}

impl RateLimiter {
    fn new(limit_per_minute: u32) -> Self {
        Self {
            requests: HashMap::new(),
            limit_per_minute,
        }
    }

    fn is_allowed(&mut self, client_id: &str) -> bool {
        let now = Instant::now();
        let one_minute_ago = now - Duration::from_secs(60);

        // Clean old requests
        let requests = self.requests.entry(client_id.to_string()).or_insert_with(Vec::new);
        requests.retain(|&time| time > one_minute_ago);

        // Check if under limit
        if requests.len() < self.limit_per_minute as usize {
            requests.push(now);
            true
        } else {
            false
        }
    }
}

/// Input validator
pub struct InputValidator {
    uri_regex: Regex,
    pubkey_regex: Regex,
}

impl InputValidator {
    fn new() -> Self {
        Self {
            uri_regex: Regex::new(r"^https://[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;%=]+$").unwrap(),
            pubkey_regex: Regex::new(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$").unwrap(),
        }
    }

    async fn validate(&self, inputs: &HashMap<String, SecurityInput>) -> PodAIResult<()> {
        for (key, input) in inputs {
            match input {
                SecurityInput::String(s) => {
                    if key == "metadata_uri" {
                        self.validate_uri(s)?;
                    } else if key.contains("pubkey") {
                        self.validate_pubkey_string(s)?;
                    }
                    
                    // Check for potential injection attacks
                    if s.contains("<script") || s.contains("javascript:") || s.contains("data:") {
                        return Err(PodAIError::ValidationFailed {
                            field: key.clone(),
                            reason: "Potential injection attack detected".to_string(),
                        });
                    }
                }
                SecurityInput::Number(n) => {
                    if key == "capabilities" {
                        self.validate_capabilities(*n)?;
                    }
                }
                SecurityInput::Bytes(bytes) => {
                    if bytes.len() > 1024 * 1024 {
                        return Err(PodAIError::ValidationFailed {
                            field: key.clone(),
                            reason: "Byte array too large (max 1MB)".to_string(),
                        });
                    }
                }
                _ => {}
            }
        }
        
        Ok(())
    }

    fn validate_uri(&self, uri: &str) -> PodAIResult<()> {
        if uri.len() > 200 {
            return Err(PodAIError::ValidationFailed {
                field: "uri".to_string(),
                reason: "URI too long (max 200 characters)".to_string(),
            });
        }

        if !self.uri_regex.is_match(uri) {
            return Err(PodAIError::ValidationFailed {
                field: "uri".to_string(),
                reason: "Invalid URI format".to_string(),
            });
        }

        Ok(())
    }

    fn validate_pubkey_string(&self, pubkey_str: &str) -> PodAIResult<()> {
        if !self.pubkey_regex.is_match(pubkey_str) {
            return Err(PodAIError::ValidationFailed {
                field: "pubkey".to_string(),
                reason: "Invalid pubkey format".to_string(),
            });
        }
        
        Ok(())
    }

    fn validate_capabilities(&self, capabilities: u64) -> PodAIResult<()> {
        // Check if capabilities are within valid range
        const MAX_CAPABILITIES: u64 = (1 << 16) - 1; // 16 bits max
        
        if capabilities > MAX_CAPABILITIES {
            return Err(PodAIError::ValidationFailed {
                field: "capabilities".to_string(),
                reason: "Capabilities exceed maximum allowed value".to_string(),
            });
        }
        
        Ok(())
    }
}

/// Signature verifier
pub struct SignatureVerifier {
    client: Arc<PodAIClient>,
}

impl SignatureVerifier {
    fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    async fn verify(
        &self,
        signature: &Signature,
        message: &[u8],
        signer_pubkey: &Pubkey,
    ) -> PodAIResult<()> {
        // Verify the signature is valid for the message and signer
        if signature.verify(signer_pubkey.as_ref(), message) {
            Ok(())
        } else {
            Err(PodAIError::ValidationFailed {
                field: "signature".to_string(),
                reason: "Invalid signature".to_string(),
            })
        }
    }
}

/// Account validator
pub struct AccountValidator {
    client: Arc<PodAIClient>,
}

impl AccountValidator {
    fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    async fn validate_accounts(&self, accounts: &[Pubkey]) -> PodAIResult<()> {
        for account in accounts {
            // Check if account exists (optional - depends on use case)
            match self.client.get_account(account).await {
                Ok(_) => {
                    debug!("Account {} validated successfully", account);
                }
                Err(_) => {
                    warn!("Account {} does not exist", account);
                    // Whether this is an error depends on the operation
                }
            }
        }
        
        Ok(())
    }
}

/// Security audit trait for components
#[async_trait]
pub trait SecurityAudit {
    async fn security_audit(&self) -> SecurityAuditResult;
}

/// Security audit result
#[derive(Debug, Clone)]
pub struct SecurityAuditResult {
    pub component: String,
    pub passed: bool,
    pub vulnerabilities: Vec<SecurityVulnerability>,
    pub recommendations: Vec<String>,
}

/// Security vulnerability definition
#[derive(Debug, Clone)]
pub struct SecurityVulnerability {
    pub severity: SecuritySeverity,
    pub category: String,
    pub description: String,
    pub remediation: String,
}

/// Security severity levels
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SecuritySeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::signature::Keypair;

    #[test]
    fn test_input_validator() {
        let validator = InputValidator::new();
        
        // Test URI validation
        assert!(validator.validate_uri("https://example.com/metadata.json").is_ok());
        assert!(validator.validate_uri("http://example.com").is_err()); // Not HTTPS
        assert!(validator.validate_uri("https://example.com/<script>").is_err());
        
        // Test capabilities validation
        assert!(validator.validate_capabilities(100).is_ok());
        assert!(validator.validate_capabilities(u64::MAX).is_err());
    }

    #[test]
    fn test_rate_limiter() {
        let mut rate_limiter = RateLimiter::new(2);
        let client_id = "test_client";
        
        assert!(rate_limiter.is_allowed(client_id));
        assert!(rate_limiter.is_allowed(client_id));
        assert!(!rate_limiter.is_allowed(client_id)); // Should be rate limited
    }

    #[tokio::test]
    async fn test_security_manager_creation() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let security_manager = SecurityManager::new(client, None);
        
        assert!(security_manager.config.enable_input_validation);
        assert!(security_manager.config.enable_rate_limiting);
        assert_eq!(security_manager.config.rate_limit_per_minute, 100);
    }
} 