/*!
 * Instructions Module
 *
 * Contains all instruction handlers for the GhostSpeak Protocol.
 */

// Core modules (working)
pub mod agent;
pub mod agent_compressed;
pub mod agent_management;

// Additional modules
pub mod a2a_protocol;
pub mod analytics;
pub mod analytics_events;
pub mod auction;
pub mod bulk_deals;
pub mod channel_operations;
pub mod compliance_governance;
pub mod credential;
pub mod dispute;
pub mod escrow_operations;
pub mod extensions;
pub mod governance_voting;
pub mod h2a_protocol;
pub mod incentives;
pub mod marketplace;
pub mod messaging;
pub mod negotiation;
pub mod pricing;
pub mod protocol_config;
pub mod replication;
pub mod reputation;
pub mod royalty;
pub mod security_init;
pub mod staking;
pub mod token_2022_operations;
pub mod work_orders;
pub mod x402_operations;

// Re-export all instruction handlers (2025 Anchor best practice)
pub use a2a_protocol::*;
pub use agent::*;
pub use agent_compressed::*;
pub use agent_management::*;
pub use analytics::*;
pub use analytics_events::*;
pub use auction::*;
pub use bulk_deals::*;
pub use channel_operations::*;
pub use compliance_governance::*;
pub use credential::*;
pub use dispute::*;
pub use escrow_operations::*;
pub use extensions::*;
pub use governance_voting::*;
pub use h2a_protocol::*;
pub use incentives::*;
pub use marketplace::*;
pub use messaging::*;
pub use negotiation::*;
pub use pricing::*;
pub use protocol_config::*;
pub use replication::*;
pub use reputation::*;
pub use royalty::*;
pub use security_init::*;
pub use staking::*;
pub use token_2022_operations::*;
pub use work_orders::*;
pub use x402_operations::*;

use anchor_lang::prelude::*;

// Common instruction result type
#[allow(dead_code)]
pub type InstructionResult<T = ()> = Result<T>;
