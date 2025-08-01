/*!
 * Agent Validation Module
 *
 * Security functions for validating agent authority and permissions
 */

use crate::state::{Agent, GhostSpeakError};
use anchor_lang::prelude::*;

/// Validates that the signer has authority over the agent
pub fn validate_agent_authority(agent: &Account<Agent>, authority: &Signer) -> Result<()> {
    require!(
        agent.owner == authority.key(),
        GhostSpeakError::UnauthorizedAccess
    );

    require!(agent.is_active, GhostSpeakError::InactiveAgent);

    Ok(())
}

/// Validates that the agent is verified
pub fn require_verified_agent(agent: &Account<Agent>) -> Result<()> {
    require!(agent.is_verified, GhostSpeakError::UnverifiedAgent);

    Ok(())
}

/// Validates that the agent supports a specific token
pub fn validate_agent_supports_token(agent: &Account<Agent>, token_mint: &Pubkey) -> Result<()> {
    require!(
        agent.supported_tokens.contains(token_mint),
        GhostSpeakError::UnsupportedToken
    );

    Ok(())
}

/// Validates that the agent supports agent-to-agent communication
pub fn require_a2a_support(agent: &Account<Agent>) -> Result<()> {
    require!(agent.supports_a2a, GhostSpeakError::A2ANotSupported);

    Ok(())
}

/// Validates agent reputation meets minimum threshold
pub fn validate_agent_reputation(agent: &Account<Agent>, min_reputation: u32) -> Result<()> {
    require!(
        agent.reputation_score >= min_reputation,
        GhostSpeakError::InsufficientReputation
    );

    Ok(())
}
