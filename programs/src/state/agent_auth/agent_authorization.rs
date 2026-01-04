/*!
 * Agent Reputation Update Authorization
 *
 * GhostSpeak's trustless system for agents to pre-authorize specific sources
 * (e.g., PayAI facilitators) to update their reputation a limited number of
 * times before expiration.
 *
 * This complements the existing FeedbackAuth (which is for clients authorizing feedback)
 * by allowing agents to authorize facilitators to update reputation automatically.
 *
 * ## Key Difference from FeedbackAuth:
 * - FeedbackAuth: Client → Agent (clients authorize feedback submission)
 * - AgentReputationAuth: Agent → Facilitator (agents authorize reputation updates)
 */

use anchor_lang::prelude::*;
use crate::state::GhostSpeakError;

// PDA Seeds
pub const AGENT_AUTH_SEED: &[u8] = b"agent_auth";
pub const AUTH_USAGE_SEED: &[u8] = b"auth_usage";

/// Agent Reputation Update Authorization
///
/// Allows an agent to grant a specific source (e.g., PayAI facilitator)
/// permission to update their reputation up to `index_limit` times
/// before `expires_at`.
#[account]
pub struct AgentReputationAuth {
    /// Agent granting authorization
    pub agent: Pubkey,

    /// Authorized source (e.g., PayAI facilitator address)
    pub authorized_source: Pubkey,

    /// Maximum number of reputation updates allowed
    pub index_limit: u64,

    /// Current usage count (number of times used)
    pub current_index: u64,

    /// Expiration timestamp (Unix seconds)
    pub expires_at: i64,

    /// Solana network this authorization is valid on
    /// 0 = mainnet-beta, 1 = devnet, 2 = testnet, 3 = localnet
    pub network: u8,

    /// Ed25519 signature proving agent's intent (64 bytes)
    pub signature: [u8; 64],

    /// Optional nonce for replay protection
    pub nonce: Option<String>,

    /// Whether this authorization has been revoked
    pub revoked: bool,

    /// Creation timestamp
    pub created_at: i64,

    /// Last used timestamp
    pub last_used_at: Option<i64>,

    /// Total reputation change applied via this authorization
    pub total_reputation_change: i64,

    /// PDA bump
    pub bump: u8,
}

impl AgentReputationAuth {
    pub const MAX_NONCE_LEN: usize = 64;

    pub const LEN: usize = 8 + // discriminator
        32 + // agent
        32 + // authorized_source
        8 + // index_limit
        8 + // current_index
        8 + // expires_at
        1 + // network
        64 + // signature
        1 + 4 + Self::MAX_NONCE_LEN + // nonce Option<String>
        1 + // revoked
        8 + // created_at
        1 + 8 + // last_used_at Option<i64>
        8 + // total_reputation_change
        1; // bump

    /// Initialize authorization
    pub fn initialize(
        &mut self,
        agent: Pubkey,
        authorized_source: Pubkey,
        index_limit: u64,
        expires_at: i64,
        network: u8,
        signature: [u8; 64],
        nonce: Option<String>,
        bump: u8,
    ) -> Result<()> {
        // Validate inputs
        require!(index_limit > 0, GhostSpeakError::InvalidInput);
        require!(network <= 3, GhostSpeakError::InvalidInput); // Valid networks: 0-3

        if let Some(ref n) = nonce {
            require!(n.len() <= Self::MAX_NONCE_LEN, GhostSpeakError::InvalidInput);
        }

        let clock = Clock::get()?;

        // Ensure expiration is in the future
        require!(
            expires_at > clock.unix_timestamp,
            GhostSpeakError::InvalidInput
        );

        self.agent = agent;
        self.authorized_source = authorized_source;
        self.index_limit = index_limit;
        self.current_index = 0;
        self.expires_at = expires_at;
        self.network = network;
        self.signature = signature;
        self.nonce = nonce;
        self.revoked = false;
        self.created_at = clock.unix_timestamp;
        self.last_used_at = None;
        self.total_reputation_change = 0;
        self.bump = bump;

        Ok(())
    }

    /// Record usage of this authorization
    pub fn record_usage(&mut self, reputation_change: i64) -> Result<()> {
        let clock = Clock::get()?;

        // Increment usage counter
        self.current_index = self.current_index.saturating_add(1);

        // Update last used timestamp
        self.last_used_at = Some(clock.unix_timestamp);

        // Track total reputation change
        self.total_reputation_change = self.total_reputation_change.saturating_add(reputation_change);

        Ok(())
    }

    /// Revoke authorization (by agent)
    pub fn revoke(&mut self) -> Result<()> {
        require!(!self.revoked, GhostSpeakError::AlreadyRevoked);
        self.revoked = true;
        Ok(())
    }

    /// Check if authorization is valid
    pub fn is_valid(&self, current_time: i64) -> Result<bool> {
        // Check if revoked
        if self.revoked {
            return Ok(false);
        }

        // Check if expired
        if current_time >= self.expires_at {
            return Ok(false);
        }

        // Check if index limit exceeded
        if self.current_index >= self.index_limit {
            return Ok(false);
        }

        Ok(true)
    }

    /// Get status of authorization
    pub fn get_status(&self, current_time: i64) -> AuthorizationStatus {
        if self.revoked {
            return AuthorizationStatus::Revoked;
        }

        if current_time >= self.expires_at {
            return AuthorizationStatus::Expired;
        }

        if self.current_index >= self.index_limit {
            return AuthorizationStatus::Exhausted;
        }

        AuthorizationStatus::Active
    }

    /// Get remaining uses
    pub fn remaining_uses(&self) -> u64 {
        self.index_limit.saturating_sub(self.current_index)
    }

    /// Validate network matches expected
    pub fn validate_network(&self, expected_network: u8) -> Result<()> {
        require!(
            self.network == expected_network,
            GhostSpeakError::NetworkMismatch
        );
        Ok(())
    }
}

/// Authorization status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AuthorizationStatus {
    Active = 0,
    Expired = 1,
    Exhausted = 2,
    Revoked = 3,
}

/// Authorization usage record
///
/// Tracks individual uses of an authorization for audit purposes
#[account]
pub struct AuthorizationUsageRecord {
    /// Authorization this usage belongs to
    pub authorization: Pubkey,

    /// Agent address
    pub agent: Pubkey,

    /// Authorized source that used this
    pub authorized_source: Pubkey,

    /// Index at time of use
    pub usage_index: u64,

    /// Reputation change applied
    pub reputation_change: i64,

    /// Timestamp of usage
    pub used_at: i64,

    /// Transaction signature (for cross-reference)
    pub transaction_signature: String,

    /// Additional metadata (e.g., payment details)
    pub metadata: Option<String>,

    /// PDA bump
    pub bump: u8,
}

impl AuthorizationUsageRecord {
    pub const MAX_TX_SIG_LEN: usize = 88; // Solana signature length
    pub const MAX_METADATA_LEN: usize = 256;

    pub const LEN: usize = 8 + // discriminator
        32 + // authorization
        32 + // agent
        32 + // authorized_source
        8 + // usage_index
        8 + // reputation_change
        8 + // used_at
        4 + Self::MAX_TX_SIG_LEN + // transaction_signature
        1 + 4 + Self::MAX_METADATA_LEN + // metadata Option<String>
        1; // bump

    /// Initialize usage record
    pub fn initialize(
        &mut self,
        authorization: Pubkey,
        agent: Pubkey,
        authorized_source: Pubkey,
        usage_index: u64,
        reputation_change: i64,
        transaction_signature: String,
        metadata: Option<String>,
        bump: u8,
    ) -> Result<()> {
        require!(
            transaction_signature.len() <= Self::MAX_TX_SIG_LEN,
            GhostSpeakError::InvalidInput
        );

        if let Some(ref m) = metadata {
            require!(m.len() <= Self::MAX_METADATA_LEN, GhostSpeakError::InvalidInput);
        }

        let clock = Clock::get()?;

        self.authorization = authorization;
        self.agent = agent;
        self.authorized_source = authorized_source;
        self.usage_index = usage_index;
        self.reputation_change = reputation_change;
        self.used_at = clock.unix_timestamp;
        self.transaction_signature = transaction_signature;
        self.metadata = metadata;
        self.bump = bump;

        Ok(())
    }
}

/// Helper functions for authorization verification
impl AgentReputationAuth {
    /// Verify authorization signature matches message
    ///
    /// This should be called during authorization creation to ensure
    /// the signature was created by the agent's keypair.
    ///
    /// Message format (must match TypeScript implementation):
    /// - Domain separator: "GhostSpeak Reputation Authorization"
    /// - Agent address (32 bytes)
    /// - Authorized source (32 bytes)
    /// - Index limit (8 bytes, u64 big-endian)
    /// - Expiration timestamp (8 bytes, u64 big-endian)
    /// - Network string (variable length)
    /// - Nonce (optional, variable length)
    pub fn verify_signature_message(&self, _expected_agent_pubkey: &Pubkey) -> Vec<u8> {
        let mut message = Vec::new();

        // Domain separator
        message.extend_from_slice(b"GhostSpeak Reputation Authorization");

        // Agent address
        message.extend_from_slice(&self.agent.to_bytes());

        // Authorized source
        message.extend_from_slice(&self.authorized_source.to_bytes());

        // Index limit (u64 big-endian)
        message.extend_from_slice(&self.index_limit.to_be_bytes());

        // Expiration timestamp (i64 big-endian, cast to u64 for compatibility)
        message.extend_from_slice(&(self.expires_at as u64).to_be_bytes());

        // Network string
        let network_str = match self.network {
            0 => "mainnet-beta",
            1 => "devnet",
            2 => "testnet",
            3 => "localnet",
            _ => "unknown",
        };
        message.extend_from_slice(network_str.as_bytes());

        // Nonce (if present)
        if let Some(ref nonce) = self.nonce {
            message.extend_from_slice(nonce.as_bytes());
        }

        message
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_authorization_status() {
        let mut auth = AgentReputationAuth {
            agent: Pubkey::default(),
            authorized_source: Pubkey::default(),
            index_limit: 100,
            current_index: 0,
            expires_at: 1000,
            network: 1,
            signature: [0; 64],
            nonce: None,
            revoked: false,
            created_at: 0,
            last_used_at: None,
            total_reputation_change: 0,
            bump: 0,
        };

        // Test active status
        assert_eq!(auth.get_status(500), AuthorizationStatus::Active);
        assert_eq!(auth.remaining_uses(), 100);

        // Test expired status
        assert_eq!(auth.get_status(1001), AuthorizationStatus::Expired);

        // Test exhausted status
        auth.current_index = 100;
        assert_eq!(auth.get_status(500), AuthorizationStatus::Exhausted);
        assert_eq!(auth.remaining_uses(), 0);

        // Test revoked status
        auth.current_index = 50;
        auth.revoked = true;
        assert_eq!(auth.get_status(500), AuthorizationStatus::Revoked);
    }

    #[test]
    fn test_signature_message_format() {
        let agent = Pubkey::default();
        let source = Pubkey::default();

        let auth = AgentReputationAuth {
            agent,
            authorized_source: source,
            index_limit: 1000,
            current_index: 0,
            expires_at: 1735603200, // 2024-12-31
            network: 1, // devnet
            signature: [0; 64],
            nonce: Some("test-nonce-12345".to_string()),
            revoked: false,
            created_at: 0,
            last_used_at: None,
            total_reputation_change: 0,
            bump: 0,
        };

        let message = auth.verify_signature_message(&agent);

        // Check domain separator is included
        assert!(message.starts_with(b"GhostSpeak Reputation Authorization"));

        // Check network string is included
        assert!(message.windows(6).any(|w| w == b"devnet"));

        // Check nonce is included (16 characters)
        assert!(message.windows(16).any(|w| w == b"test-nonce-12345"));
    }
}
