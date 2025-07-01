//! Channel service for managing group communication channels

use crate::client::PodAIClient;
use crate::errors::{PodAIError, PodAIResult};
use crate::types::channel::{ChannelAccount, ChannelVisibility};
use crate::utils::pda::{find_channel_pda, find_channel_participant_pda};
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::sync::Arc;

/// Service for managing channels
#[derive(Debug, Clone)]
pub struct ChannelService {
    client: Arc<PodAIClient>,
}

impl ChannelService {
    /// Create a new channel service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Create a new channel
    pub async fn create_channel(
        &self,
        creator_keypair: &Keypair,
        name: &str,
        visibility: ChannelVisibility,
        fee_per_message: Option<u64>,
    ) -> PodAIResult<ChannelCreationResult> {
        // Validate channel name
        if name.is_empty() || name.len() > 64 {
            return Err(PodAIError::invalid_input(
                "name",
                "Channel name must be 1-64 characters",
            ));
        }

        let (channel_pda, bump) = find_channel_pda(&creator_keypair.pubkey(), name);

        // Check if channel already exists
        if self.client.account_exists(&channel_pda).await? {
            return Err(PodAIError::channel("Channel already exists"));
        }

        // Create channel account
        let channel_account = ChannelAccount::new(
            creator_keypair.pubkey(),
            name.to_string(),
            visibility,
            fee_per_message,
            bump,
        )?;

        // TODO: Implement actual transaction creation and sending
        Ok(ChannelCreationResult {
            channel_pda,
            channel_account,
        })
    }

    /// Get channel PDA
    pub fn get_channel_pda(&self, creator: &Pubkey, name: &str) -> (Pubkey, u8) {
        find_channel_pda(creator, name)
    }
}

/// Result of channel creation
#[derive(Debug, Clone)]
pub struct ChannelCreationResult {
    /// The channel PDA
    pub channel_pda: Pubkey,
    /// The channel account
    pub channel_account: ChannelAccount,
}


