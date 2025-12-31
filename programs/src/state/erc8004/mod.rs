/*!
 * ERC-8004 Adapter Module
 *
 * Provides Solana-native implementations of the ERC-8004 standard
 * for trustless AI agent interactions across chains.
 */

pub mod agent_authorization;
pub mod identity_registry;
pub mod reputation_registry;
pub mod validation_registry;

pub use agent_authorization::*;
pub use identity_registry::*;
pub use reputation_registry::*;
pub use validation_registry::*;
