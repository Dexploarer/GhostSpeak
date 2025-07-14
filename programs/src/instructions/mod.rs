/*!
 * Instructions Module
 * 
 * Contains all instruction handlers for the GhostSpeak Protocol.
 */

// Core modules (working)
pub mod agent;
pub mod agent_management;

// Additional modules
pub mod a2a_protocol;
pub mod analytics;
pub mod auction;
pub mod bulk_deals;
pub mod dispute;
pub mod escrow_payment;
pub mod extensions;
pub mod incentives;
pub mod marketplace;
pub mod messaging;
pub mod negotiation;
pub mod pricing;
pub mod replication;
pub mod royalty;
pub mod work_orders;
pub mod compliance_governance;

// Re-export all instruction handlers (2025 Anchor best practice)
pub use agent::*;
pub use agent_management::*;
pub use a2a_protocol::*;
pub use analytics::*;
pub use auction::*;
pub use bulk_deals::*;
pub use dispute::*;
pub use escrow_payment::*;
pub use extensions::*;
pub use incentives::*;
pub use marketplace::*;
pub use messaging::*;
pub use negotiation::*;
pub use pricing::*;
pub use replication::*;
pub use royalty::*;
pub use work_orders::*;
pub use compliance_governance::*;

use anchor_lang::prelude::*;

// Common instruction result type 
#[allow(dead_code)]
pub type InstructionResult<T = ()> = Result<T>;