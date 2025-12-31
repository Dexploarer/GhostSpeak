/*!
 * Instructions Module
 *
 * Contains all instruction handlers for the GhostSpeak Protocol.
 */

// Core agent modules
pub mod agent;
pub mod agent_authorization; // Trustless pre-authorization for reputation updates
pub mod agent_compressed;
pub mod agent_management;

// Governance and compliance modules
pub mod compliance_governance;
pub mod credential;
pub mod did; // W3C-compliant decentralized identifiers (did:sol)
pub mod ghost_protect; // B2C escrow with dispute resolution
pub mod protocol_config;
pub mod reputation; // Multi-source reputation aggregation
pub mod security_init;
pub mod staking; // GHOST token staking for reputation boost

// Re-export all instruction handlers (2025 Anchor best practice)
pub use agent::*;
pub use agent_authorization::*;
pub use agent_compressed::*;
pub use agent_management::*;
pub use compliance_governance::*;
pub use credential::*;
pub use did::*;
pub use ghost_protect::*;
pub use protocol_config::*;
pub use reputation::*;
pub use security_init::*;
pub use staking::*;

use anchor_lang::prelude::*;

// Common instruction result type
#[allow(dead_code)]
pub type InstructionResult<T = ()> = Result<T>;
