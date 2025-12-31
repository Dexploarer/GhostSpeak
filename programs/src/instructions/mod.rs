/*!
 * Instructions Module
 *
 * Contains all instruction handlers for the GhostSpeak Protocol.
 */

// Core modules (working)
pub mod agent;
pub mod agent_authorization; // ERC-8004 parity for PayAI
pub mod agent_compressed;
pub mod agent_management;

// Payment modules - commented out until implemented
// pub mod pay_with_usdc;
// pub mod burn_ghost_for_payment;
// pub mod pay_with_crossmint;

// B2B billing module - commented out until implemented
// pub mod b2b_billing;

// Additional modules
// pub mod a2a_protocol; // REMOVED - agent messaging not needed for VC/Reputation
// pub mod analytics; // Removed
// pub mod analytics_events; // Removed
// pub mod auction; // Removed
// pub mod bulk_deals; // Removed
// pub mod channel_operations; // Removed
pub mod compliance_governance;
// pub mod access_control; // Temporarily commented out - missing methods on StakingAccount
pub mod credential;
pub mod did; // Decentralized identifiers (did:sol)
// pub mod dispute; // Removed
pub mod ghost_protect;
// pub mod extensions; // Removed
// pub mod governance_voting; // Removed - simple admin authority via protocol_config
// pub mod h2a_protocol; // REMOVED - human-agent messaging not needed for VC/Reputation
// pub mod incentives; // Removed - payment-based incentives delegated to PayAI
// pub mod marketplace; // Removed
// pub mod messaging; // Removed
// pub mod negotiation; // Removed
// pub mod pricing; // Removed
pub mod protocol_config;
// pub mod replication; // Removed
pub mod reputation;
// pub mod revenue_distribution; // Commented out until implemented
// pub mod royalty; // Removed
// pub mod privacy; // Temporarily commented out - has errors with owner field
pub mod security_init;
pub mod staking;
// pub mod token_2022_operations; // Removed - not aligned with VC/Reputation pivot
// pub mod work_orders; // Removed
// pub mod x402_operations; // Removed - payment facilitation delegated to PayAI

// Re-export all instruction handlers (2025 Anchor best practice)
// pub use a2a_protocol::*; // REMOVED
pub use agent::*;
pub use agent_authorization::*; // ERC-8004 parity for PayAI
pub use agent_compressed::*;
pub use agent_management::*;
// pub use pay_with_usdc::*;
// pub use burn_ghost_for_payment::*;
// pub use pay_with_crossmint::*;
// pub use b2b_billing::*;
// pub mod analytics re-exports removed
pub use compliance_governance::*;
// pub use access_control::*; // Temporarily commented out - module has errors
pub use credential::*;
pub use did::*; // DID instruction handlers
// pub use dispute::*; // Removed
pub use ghost_protect::*;
// pub mod extensions re-exports removed
// pub use governance_voting::*; // Removed - simple admin authority via protocol_config
// pub use h2a_protocol::*; // REMOVED
// pub use incentives::*; // Removed
pub use protocol_config::*;
pub use reputation::*;
// pub use revenue_distribution::*;
// pub use privacy::*; // Temporarily commented out - module has errors
pub use security_init::*;
pub use staking::*;
// pub use token_2022_operations::*; // Removed
// pub use work_orders::*; // Removed
// pub use x402_operations::*; // Removed

use anchor_lang::prelude::*;

// Common instruction result type
#[allow(dead_code)]
pub type InstructionResult<T = ()> = Result<T>;
