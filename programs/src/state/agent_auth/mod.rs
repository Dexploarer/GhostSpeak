/*!
 * Agent Authorization Module
 *
 * GhostSpeak's trustless agent pre-authorization system for
 * secure, delegated reputation management across protocols.
 */

pub mod agent_authorization;
pub mod identity_registry;
pub mod reputation_registry;
pub mod validation_registry;

pub use agent_authorization::*;
pub use identity_registry::*;
pub use reputation_registry::*;
pub use validation_registry::*;
