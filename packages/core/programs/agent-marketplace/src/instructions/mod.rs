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

// Re-export instruction handlers
use anchor_lang::prelude::*;

// Common instruction result type 
#[allow(dead_code)]
pub type InstructionResult<T = ()> = Result<T>;