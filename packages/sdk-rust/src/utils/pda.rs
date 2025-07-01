//! Program Derived Address (PDA) utilities for the podAI SDK

use crate::errors::{PodAIError, PodAIResult};
use crate::types::message::MessageType;
use crate::PROGRAM_ID;
use solana_sdk::pubkey::Pubkey;

/// Find the agent PDA for a given wallet
pub fn find_agent_pda(wallet: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"agent", wallet.as_ref()], &PROGRAM_ID)
}

/// Find the message PDA for sender, recipient, payload hash, and message type
pub fn find_message_pda(
    sender: &Pubkey,
    recipient: &Pubkey,
    payload_hash: &[u8; 32],
    message_type: MessageType,
) -> (Pubkey, u8) {
    let message_type_byte = message_type.as_byte();
    Pubkey::find_program_address(
        &[
            b"message",
            sender.as_ref(),
            recipient.as_ref(),
            payload_hash,
            &[message_type_byte],
        ],
        &PROGRAM_ID,
    )
}

/// Find the channel PDA for creator and channel name
pub fn find_channel_pda(creator: &Pubkey, name: &str) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"channel", creator.as_ref(), name.as_bytes()],
        &PROGRAM_ID,
    )
}

/// Find the channel participant PDA
pub fn find_channel_participant_pda(channel: &Pubkey, participant: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"participant", channel.as_ref(), participant.as_ref()],
        &PROGRAM_ID,
    )
}

/// Find the channel message PDA
pub fn find_channel_message_pda(
    channel: &Pubkey,
    sender: &Pubkey,
    nonce: u64,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            b"channel_message",
            channel.as_ref(),
            sender.as_ref(),
            &nonce.to_le_bytes(),
        ],
        &PROGRAM_ID,
    )
}

/// Find the channel invitation PDA
pub fn find_channel_invitation_pda(channel: &Pubkey, invitee: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"invitation", channel.as_ref(), invitee.as_ref()],
        &PROGRAM_ID,
    )
}

/// Find the escrow PDA for a channel and depositor
pub fn find_escrow_pda(channel: &Pubkey, depositor: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"escrow", channel.as_ref(), depositor.as_ref()],
        &PROGRAM_ID,
    )
}

/// Find the product request PDA
pub fn find_product_request_pda(
    requester: &Pubkey,
    target_agent: &Pubkey,
    request_type: u8,
    requirements: &str,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            b"product_request",
            requester.as_ref(),
            target_agent.as_ref(),
            &[request_type],
            requirements.as_bytes(),
        ],
        &PROGRAM_ID,
    )
}

/// Find the data product PDA
pub fn find_data_product_pda(
    creator: &Pubkey,
    content_hash: &[u8; 32],
    title: &str,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            b"data_product",
            creator.as_ref(),
            content_hash,
            title.as_bytes(),
        ],
        &PROGRAM_ID,
    )
}

/// Find the capability service PDA
pub fn find_capability_service_pda(
    provider: &Pubkey,
    service_type: u8,
    service_name: &str,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            b"capability_service",
            provider.as_ref(),
            &[service_type],
            service_name.as_bytes(),
        ],
        &PROGRAM_ID,
    )
}

/// Find the agent NFT container PDA
pub fn find_agent_nft_container_pda(
    agent: &Pubkey,
    agent_mint: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            b"agent_container",
            agent.as_ref(),
            agent_mint.as_ref(),
        ],
        &PROGRAM_ID,
    )
}

/// Find the sales conversation PDA
pub fn find_sales_conversation_pda(
    agent_container: &Pubkey,
    buyer: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            b"sales_conversation",
            agent_container.as_ref(),
            buyer.as_ref(),
        ],
        &PROGRAM_ID,
    )
}

/// Validate that a PDA was derived correctly
pub fn validate_pda(
    expected_pda: &Pubkey,
    seeds: &[&[u8]],
    program_id: &Pubkey,
) -> PodAIResult<u8> {
    let (derived_pda, bump) = Pubkey::find_program_address(seeds, program_id);
    
    if derived_pda != *expected_pda {
        return Err(PodAIError::invalid_input(
            "pda",
            format!("PDA mismatch: expected {}, got {}", expected_pda, derived_pda),
        ));
    }
    
    Ok(bump)
}

/// PDA derivation utility for dynamic seed construction
#[derive(Debug, Clone)]
pub struct PdaBuilder {
    seeds: Vec<Vec<u8>>,
    program_id: Pubkey,
}

impl PdaBuilder {
    /// Create a new PDA builder
    pub fn new(program_id: Pubkey) -> Self {
        Self {
            seeds: Vec::new(),
            program_id,
        }
    }

    /// Add a string seed
    pub fn add_str(mut self, seed: &str) -> Self {
        self.seeds.push(seed.as_bytes().to_vec());
        self
    }

    /// Add a byte seed
    pub fn add_bytes(mut self, seed: &[u8]) -> Self {
        self.seeds.push(seed.to_vec());
        self
    }

    /// Add a pubkey seed
    pub fn add_pubkey(mut self, pubkey: &Pubkey) -> Self {
        self.seeds.push(pubkey.as_ref().to_vec());
        self
    }

    /// Add a u64 seed (as little-endian bytes)
    pub fn add_u64(mut self, value: u64) -> Self {
        self.seeds.push(value.to_le_bytes().to_vec());
        self
    }

    /// Add a u8 seed
    pub fn add_u8(mut self, value: u8) -> Self {
        self.seeds.push(vec![value]);
        self
    }

    /// Build the PDA
    pub fn build(self) -> (Pubkey, u8) {
        let seed_refs: Vec<&[u8]> = self.seeds.iter().map(|s| s.as_slice()).collect();
        Pubkey::find_program_address(&seed_refs, &self.program_id)
    }
}

/// Common PDA patterns for the podAI protocol
pub struct PdaPatterns;

impl PdaPatterns {
    /// Get all agent-related PDAs for a wallet
    pub fn agent_pdas(wallet: &Pubkey) -> AgentPdas {
        let (agent_pda, agent_bump) = find_agent_pda(wallet);
        
        AgentPdas {
            agent: (agent_pda, agent_bump),
        }
    }

    /// Get all channel-related PDAs
    pub fn channel_pdas(
        creator: &Pubkey,
        name: &str,
        participant: Option<&Pubkey>,
    ) -> ChannelPdas {
        let (channel_pda, channel_bump) = find_channel_pda(creator, name);
        
        let participant_pda = participant.map(|p| find_channel_participant_pda(&channel_pda, p));
        let escrow_pda = participant.map(|p| find_escrow_pda(&channel_pda, p));
        let invitation_pda = participant.map(|p| find_channel_invitation_pda(&channel_pda, p));

        ChannelPdas {
            channel: (channel_pda, channel_bump),
            participant: participant_pda,
            escrow: escrow_pda,
            invitation: invitation_pda,
        }
    }
}

/// Collection of agent-related PDAs
#[derive(Debug, Clone)]
pub struct AgentPdas {
    pub agent: (Pubkey, u8),
}

/// Collection of channel-related PDAs
#[derive(Debug, Clone)]
pub struct ChannelPdas {
    pub channel: (Pubkey, u8),
    pub participant: Option<(Pubkey, u8)>,
    pub escrow: Option<(Pubkey, u8)>,
    pub invitation: Option<(Pubkey, u8)>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::message::MessageType;
    use std::str::FromStr;

    #[test]
    fn test_agent_pda() {
        let wallet = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let (pda, bump) = find_agent_pda(&wallet);
        
        // Verify PDA derivation
        let expected_seeds = &[b"agent", wallet.as_ref()];
        let (expected_pda, expected_bump) = Pubkey::find_program_address(expected_seeds, &PROGRAM_ID);
        
        assert_eq!(pda, expected_pda);
        assert_eq!(bump, expected_bump);
    }

    #[test]
    fn test_message_pda() {
        let sender = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let recipient = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let payload_hash = [1u8; 32];
        let message_type = MessageType::Text;

        let (pda, bump) = find_message_pda(&sender, &recipient, &payload_hash, message_type);
        
        // Verify PDA derivation
        let expected_seeds = &[
            b"message",
            sender.as_ref(),
            recipient.as_ref(),
            payload_hash.as_ref(),
            &[message_type.as_byte()],
        ];
        let (expected_pda, expected_bump) = Pubkey::find_program_address(expected_seeds, &PROGRAM_ID);
        
        assert_eq!(pda, expected_pda);
        assert_eq!(bump, expected_bump);
    }

    #[test]
    fn test_channel_pda() {
        let creator = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let name = "test-channel";

        let (pda, bump) = find_channel_pda(&creator, name);
        
        // Verify PDA derivation
        let expected_seeds = &[b"channel", creator.as_ref(), name.as_bytes()];
        let (expected_pda, expected_bump) = Pubkey::find_program_address(expected_seeds, &PROGRAM_ID);
        
        assert_eq!(pda, expected_pda);
        assert_eq!(bump, expected_bump);
    }

    #[test]
    fn test_pda_builder() {
        let wallet = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let nonce = 42u64;
        
        let (pda1, bump1) = PdaBuilder::new(PROGRAM_ID)
            .add_str("test")
            .add_pubkey(&wallet)
            .add_u64(nonce)
            .build();
        
        // Manual derivation for comparison
        let (pda2, bump2) = Pubkey::find_program_address(
            &[b"test", wallet.as_ref(), &nonce.to_le_bytes()],
            &PROGRAM_ID,
        );
        
        assert_eq!(pda1, pda2);
        assert_eq!(bump1, bump2);
    }

    #[test]
    fn test_validate_pda() {
        let wallet = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let (pda, expected_bump) = find_agent_pda(&wallet);
        
        // Valid PDA
        let seeds = &[b"agent", wallet.as_ref()];
        let bump = validate_pda(&pda, seeds, &PROGRAM_ID).unwrap();
        assert_eq!(bump, expected_bump);
        
        // Invalid PDA
        let wrong_pda = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let result = validate_pda(&wrong_pda, seeds, &PROGRAM_ID);
        assert!(result.is_err());
    }

    #[test]
    fn test_pda_patterns() {
        let wallet = Pubkey::from_str("11111111111111111111111111111112").unwrap();
        let creator = Pubkey::from_str("11111111111111111111111111111113").unwrap();
        let name = "test-channel";
        
        // Agent PDAs
        let agent_pdas = PdaPatterns::agent_pdas(&wallet);
        let (expected_agent_pda, expected_agent_bump) = find_agent_pda(&wallet);
        assert_eq!(agent_pdas.agent, (expected_agent_pda, expected_agent_bump));
        
        // Channel PDAs with participant
        let channel_pdas = PdaPatterns::channel_pdas(&creator, name, Some(&wallet));
        assert!(channel_pdas.participant.is_some());
        assert!(channel_pdas.escrow.is_some());
        assert!(channel_pdas.invitation.is_some());
        
        // Channel PDAs without participant
        let channel_pdas_no_participant = PdaPatterns::channel_pdas(&creator, name, None);
        assert!(channel_pdas_no_participant.participant.is_none());
        assert!(channel_pdas_no_participant.escrow.is_none());
        assert!(channel_pdas_no_participant.invitation.is_none());
    }
} 