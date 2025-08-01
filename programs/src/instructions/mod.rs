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
pub mod dispute;
pub mod escrow_operations;
pub mod escrow_payment;
pub mod extensions;
pub mod governance_voting;
pub mod h2a_protocol;
pub mod incentives;
pub mod marketplace;
pub mod messaging;
pub mod negotiation;
pub mod pricing;
pub mod replication;
pub mod royalty;
pub mod token_2022_operations;
pub mod work_orders;

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
pub use dispute::*;
pub use escrow_operations::*;
pub use escrow_payment::*;
pub use extensions::*;
pub use governance_voting::*;
pub use h2a_protocol::*;
pub use incentives::*;
pub use marketplace::*;
pub use messaging::*;
pub use negotiation::*;
pub use pricing::*;
pub use replication::*;
pub use royalty::*;
pub use token_2022_operations::*;
pub use work_orders::*;

use anchor_lang::prelude::*;

// Common instruction result type
#[allow(dead_code)]
pub type InstructionResult<T = ()> = Result<T>;
