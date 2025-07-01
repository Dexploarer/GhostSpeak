//! Escrow service for managing secure financial transactions

use crate::client::PodAIClient;
use crate::errors::{PodAIError, PodAIResult};
use crate::types::escrow::EscrowAccount;
use crate::utils::pda::find_escrow_pda;
use solana_sdk::{pubkey::Pubkey, signature::Keypair};
use std::sync::Arc;

/// Service for managing escrow accounts
#[derive(Debug, Clone)]
pub struct EscrowService {
    client: Arc<PodAIClient>,
}

impl EscrowService {
    /// Create a new escrow service
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self { client }
    }

    /// Create an escrow account
    pub async fn create_escrow(
        &self,
        depositor_keypair: &Keypair,
        channel: &Pubkey,
        initial_deposit: u64,
    ) -> PodAIResult<EscrowCreationResult> {
        let (escrow_pda, bump) = find_escrow_pda(channel, &depositor_keypair.pubkey());

        // Check if escrow already exists
        if self.client.account_exists(&escrow_pda).await? {
            return Err(PodAIError::escrow("Escrow already exists"));
        }

        // Create escrow account
        let escrow_account = EscrowAccount::new(
            depositor_keypair.pubkey(),
            *channel,
            initial_deposit,
            bump,
        )?;

        // TODO: Implement actual transaction creation and sending
        Ok(EscrowCreationResult {
            escrow_pda,
            escrow_account,
        })
    }

    /// Get escrow PDA
    pub fn get_escrow_pda(&self, channel: &Pubkey, depositor: &Pubkey) -> (Pubkey, u8) {
        find_escrow_pda(channel, depositor)
    }
}

/// Result of escrow creation
#[derive(Debug, Clone)]
pub struct EscrowCreationResult {
    /// The escrow PDA
    pub escrow_pda: Pubkey,
    /// The escrow account
    pub escrow_account: EscrowAccount,
}
