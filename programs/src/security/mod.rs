/*! 
 * Security Module
 * 
 * Comprehensive security implementations for GhostSpeak protocol
 * including reentrancy protection, access control, rate limiting, and secure operations.
 */

pub mod reentrancy;
pub mod rate_limiting;

// Re-export security types
pub use reentrancy::{
    ReentrancyGuard,
    ReentrancyState,
    InstructionLock,
    AccountLock,
    ReentrancyCleanup,
    InitializeReentrancyGuard,
    CreateInstructionLock,
    CreateAccountLock,
    is_instruction_locked,
    is_account_locked,
};

pub use rate_limiting::{
    RateLimiter,
    RateLimitConfig,
    OperationLimit,
    UserRateLimit,
    InitializeRateLimiter,
    CheckRateLimit,
    validation,
};