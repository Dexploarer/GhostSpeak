/*!
 * Security Module
 *
 * Comprehensive security implementations for GhostSpeak protocol
 * including reentrancy protection, access control, rate limiting,
 * commit-reveal schemes, and secure operations.
 */

pub mod admin_validation;
pub mod agent_validation;
pub mod circuit_breaker;
// pub mod commit_reveal; // REMOVED - auction code
pub mod rate_limiting;
pub mod reentrancy;

// Re-export security types
pub use reentrancy::{
    is_account_locked, is_instruction_locked, AccountLock, CreateAccountLock,
    CreateInstructionLock, InitializeReentrancyGuard, InstructionLock, ReentrancyCleanup,
    ReentrancyGuard, ReentrancyState,
};

pub use rate_limiting::{
    validation, CheckRateLimit, InitializeRateLimiter, OperationLimit, RateLimitConfig,
    RateLimiter, UserRateLimit,
};

// pub use commit_reveal::*; // REMOVED - auction code

pub use admin_validation::{
    is_system_address, is_test_address, require_valid_admin, validate_admin_configuration,
    AdminValidationError, AdminValidationResult, NetworkType,
};

pub use agent_validation::{
    require_a2a_support, require_verified_agent, validate_agent_authority,
    validate_agent_reputation, validate_agent_supports_token,
};

pub use circuit_breaker::{
    initialize_circuit_breaker, pause_instruction, pause_protocol, unpause_instruction,
    unpause_protocol, CircuitBreaker, InitializeCircuitBreaker, InstructionType, PauseProtocol,
    PausedInstructions, UnpauseProtocol,
};

// Re-export the check_not_paused macro from crate root (macros are exported at crate root)
pub use crate::check_not_paused;
