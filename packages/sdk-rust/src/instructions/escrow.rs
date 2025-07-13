use std::sync::Arc;

use async_trait::async_trait;
use borsh::{BorshSerialize, BorshDeserialize};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    system_program,
};
use spl_token;
use tracing::{debug, instrument};

use crate::{
    client::PodAIClient,
    client::transaction_factory::{TransactionFactory, TransactionResult},
    errors::{PodAIError, PodAIResult},
    instructions::{ComputeUnitEstimator, InstructionBuilder},
    types::escrow::{Escrow, EscrowStatus},
    utils::find_escrow_pda,
    impl_instruction_builder_basics,
};

// Instruction discriminators for escrow operations
const CREATE_ESCROW_DISCRIMINATOR: [u8; 8] = [200, 134, 108, 127, 249, 51, 100, 233];
const RELEASE_ESCROW_DISCRIMINATOR: [u8; 8] = [191, 227, 5, 119, 70, 138, 34, 116];
const CANCEL_ESCROW_DISCRIMINATOR: [u8; 8] = [63, 193, 153, 126, 106, 129, 54, 249];
const DISPUTE_ESCROW_DISCRIMINATOR: [u8; 8] = [240, 105, 180, 98, 194, 61, 196, 119];

// Instruction data structures
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct CreateEscrowInstructionData {
    pub amount: u64,
    pub conditions: Vec<u8>,
    pub deadline: i64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ReleaseEscrowInstructionData {
    pub proof: Vec<u8>,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct DisputeEscrowInstructionData {
    pub reason: String,
    pub evidence: Vec<u8>,
}

/// Result of escrow creation
#[derive(Debug, Clone)]
pub struct EscrowCreationResult {
    pub signature: solana_sdk::signature::Signature,
    pub escrow_pda: Pubkey,
    pub escrow_id: u64,
    pub transaction_result: TransactionResult,
}

/// Builder for creating an escrow
pub struct CreateEscrowBuilder {
    client: Arc<PodAIClient>,
    signer: Option<Keypair>,
    recipient: Option<Pubkey>,
    amount: Option<u64>,
    conditions: Option<Vec<u8>>,
    deadline: Option<i64>,
    transaction_factory: Option<TransactionFactory>,
}

impl CreateEscrowBuilder {
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            signer: None,
            recipient: None,
            amount: None,
            conditions: None,
            deadline: None,
            transaction_factory: None,
        }
    }

    pub fn signer(mut self, signer: Keypair) -> Self {
        self.signer = Some(signer);
        self
    }

    pub fn recipient(mut self, recipient: Pubkey) -> Self {
        self.recipient = Some(recipient);
        self
    }

    pub fn amount(mut self, amount: u64) -> Self {
        self.amount = Some(amount);
        self
    }

    pub fn conditions(mut self, conditions: Vec<u8>) -> Self {
        self.conditions = Some(conditions);
        self
    }

    pub fn conditions_string(mut self, conditions: impl Into<String>) -> Self {
        self.conditions = Some(conditions.into().into_bytes());
        self
    }

    pub fn deadline(mut self, deadline: i64) -> Self {
        self.deadline = Some(deadline);
        self
    }

    pub fn transaction_factory(mut self, factory: TransactionFactory) -> Self {
        self.transaction_factory = Some(factory);
        self
    }

    fn validate_params(&self) -> PodAIResult<()> {
        if self.signer.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "signer".to_string(),
                reason: "Signer is required".to_string(),
            });
        }

        if self.recipient.is_none() {
            return Err(PodAIError::InvalidInput {
                field: "recipient".to_string(),
                reason: "Recipient is required".to_string(),
            });
        }

        if self.amount.is_none() || self.amount == Some(0) {
            return Err(PodAIError::InvalidInput {
                field: "amount".to_string(),
                reason: "Amount must be greater than 0".to_string(),
            });
        }

        Ok(())
    }

    #[instrument(skip(self))]
    pub async fn execute(self) -> PodAIResult<EscrowCreationResult> {
        debug!("Executing escrow creation");
        
        self.validate_params()?;

        let signer = self.signer.unwrap();
        let recipient = self.recipient.unwrap();
        let amount = self.amount.unwrap();
        let conditions = self.conditions.unwrap_or_default();
        let deadline = self.deadline.unwrap_or_else(|| {
            chrono::Utc::now().timestamp() + (30 * 24 * 60 * 60) // Default 30 days
        });

        let factory = self.transaction_factory.unwrap_or_else(|| {
            TransactionFactory::new(self.client.clone())
        });

        // Generate escrow ID
        let escrow_id = chrono::Utc::now().timestamp() as u64;
        let escrow_pda = find_escrow_pda(&signer.pubkey(), escrow_id);

        let instruction_builder = CreateEscrowInstructionBuilder {
            client: self.client.clone(),
            signer: signer.clone(),
            recipient,
            amount,
            conditions,
            deadline,
            escrow_id,
        };

        let instructions = instruction_builder.build().await?;
        let signers = vec![&signer];

        let transaction_result = factory
            .execute_transaction(instructions, &signers, Some(&signer.pubkey()))
            .await?;

        Ok(EscrowCreationResult {
            signature: transaction_result.signature,
            escrow_pda,
            escrow_id,
            transaction_result,
        })
    }
}

/// Internal instruction builder for escrow creation
struct CreateEscrowInstructionBuilder {
    client: Arc<PodAIClient>,
    signer: Keypair,
    recipient: Pubkey,
    amount: u64,
    conditions: Vec<u8>,
    deadline: i64,
    escrow_id: u64,
}

#[async_trait]
impl InstructionBuilder for CreateEscrowInstructionBuilder {
    async fn build(&self) -> PodAIResult<Vec<Instruction>> {
        let escrow_pda = find_escrow_pda(&self.signer.pubkey(), self.escrow_id);
        
        // Check sender balance
        let balance = self.client.get_balance(&self.signer.pubkey()).await?;
        if balance < self.amount {
            return Err(PodAIError::InsufficientBalance {
                required: self.amount,
                available: balance,
            });
        }

        let instruction = build_create_escrow_instruction(
            &self.signer.pubkey(),
            &self.recipient,
            &escrow_pda,
            self.amount,
            &self.conditions,
            self.deadline,
        )?;

        Ok(vec![instruction])
    }

    fn payer(&self) -> Pubkey {
        self.signer.pubkey()
    }

    fn signers(&self) -> Vec<&Keypair> {
        vec![&self.signer]
    }

    fn instruction_type(&self) -> &'static str {
        "create_escrow"
    }

    fn validate(&self) -> PodAIResult<()> {
        if self.conditions.len() > 500 {
            return Err(PodAIError::ValidationFailed {
                field: "conditions".to_string(),
                reason: "Conditions too long (max 500 bytes)".to_string(),
            });
        }
        Ok(())
    }
}

impl ComputeUnitEstimator for CreateEscrowInstructionBuilder {
    fn estimate_compute_units(&self) -> u32 {
        // Escrow creation with transfer
        70_000
    }
}

/// Builder for releasing escrow
pub struct ReleaseEscrowBuilder {
    client: Arc<PodAIClient>,
    signer: Option<Keypair>,
    escrow: Option<Pubkey>,
    proof: Option<Vec<u8>>,
    transaction_factory: Option<TransactionFactory>,
}

impl ReleaseEscrowBuilder {
    pub fn new(client: Arc<PodAIClient>) -> Self {
        Self {
            client,
            signer: None,
            escrow: None,
            proof: None,
            transaction_factory: None,
        }
    }

    pub fn signer(mut self, signer: Keypair) -> Self {
        self.signer = Some(signer);
        self
    }

    pub fn escrow(mut self, escrow: Pubkey) -> Self {
        self.escrow = Some(escrow);
        self
    }

    pub fn proof(mut self, proof: Vec<u8>) -> Self {
        self.proof = Some(proof);
        self
    }

    pub fn proof_string(mut self, proof: impl Into<String>) -> Self {
        self.proof = Some(proof.into().into_bytes());
        self
    }

    pub fn transaction_factory(mut self, factory: TransactionFactory) -> Self {
        self.transaction_factory = Some(factory);
        self
    }

    #[instrument(skip(self))]
    pub async fn execute(self) -> PodAIResult<TransactionResult> {
        debug!("Executing escrow release");

        let signer = self.signer.ok_or_else(|| PodAIError::InvalidInput {
            field: "signer".to_string(),
            reason: "Signer is required".to_string(),
        })?;

        let escrow = self.escrow.ok_or_else(|| PodAIError::InvalidInput {
            field: "escrow".to_string(),
            reason: "Escrow account is required".to_string(),
        })?;

        let proof = self.proof.unwrap_or_default();

        let factory = self.transaction_factory.unwrap_or_else(|| {
            TransactionFactory::new(self.client.clone())
        });

        let instruction_builder = ReleaseEscrowInstructionBuilder {
            client: self.client.clone(),
            signer: signer.clone(),
            escrow,
            proof,
        };

        let instructions = instruction_builder.build().await?;
        let signers = vec![&signer];

        factory
            .execute_transaction(instructions, &signers, Some(&signer.pubkey()))
            .await
    }
}

/// Internal instruction builder for releasing escrow
struct ReleaseEscrowInstructionBuilder {
    client: Arc<PodAIClient>,
    signer: Keypair,
    escrow: Pubkey,
    proof: Vec<u8>,
}

#[async_trait]
impl InstructionBuilder for ReleaseEscrowInstructionBuilder {
    async fn build(&self) -> PodAIResult<Vec<Instruction>> {
        // Verify escrow exists and get details
        let escrow_account = self.client
            .get_account(&self.escrow)
            .await
            .map_err(|_| PodAIError::AccountNotFound {
                account_type: "Escrow".to_string(),
                address: self.escrow.to_string(),
            })?;

        // In production, we would deserialize the escrow account to get recipient
        // For now, we'll use a placeholder
        let recipient = Pubkey::new_unique();

        let instruction = build_release_escrow_instruction(
            &self.signer.pubkey(),
            &self.escrow,
            &recipient,
            &self.proof,
        )?;

        Ok(vec![instruction])
    }

    fn payer(&self) -> Pubkey {
        self.signer.pubkey()
    }

    fn signers(&self) -> Vec<&Keypair> {
        vec![&self.signer]
    }

    fn instruction_type(&self) -> &'static str {
        "release_escrow"
    }
}

impl ComputeUnitEstimator for ReleaseEscrowInstructionBuilder {
    fn estimate_compute_units(&self) -> u32 {
        // Escrow release with validation
        80_000
    }
}

// Helper functions to build Anchor-compatible instructions

fn build_create_escrow_instruction(
    depositor: &Pubkey,
    recipient: &Pubkey,
    escrow_pda: &Pubkey,
    amount: u64,
    conditions: &[u8],
    deadline: i64,
) -> PodAIResult<Instruction> {
    // Find the escrow token account PDA
    let (escrow_token_pda, _) = Pubkey::find_program_address(
        &[b"escrow_token", escrow_pda.as_ref()],
        &crate::PROGRAM_ID,
    );

    let accounts = vec![
        AccountMeta::new(*escrow_pda, false),
        AccountMeta::new(escrow_token_pda, false),
        AccountMeta::new(*depositor, true),
        AccountMeta::new_readonly(*recipient, false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&CREATE_ESCROW_DISCRIMINATOR);
    
    let args = CreateEscrowInstructionData {
        amount,
        conditions: conditions.to_vec(),
        deadline,
    };
    
    args.serialize(&mut instruction_data)
        .map_err(|e| PodAIError::SerializationError {
            message: format!("Failed to serialize create_escrow instruction: {}", e),
        })?;
    
    Ok(Instruction {
        program_id: crate::PROGRAM_ID,
        accounts,
        data: instruction_data,
    })
}

fn build_release_escrow_instruction(
    releaser: &Pubkey,
    escrow_pda: &Pubkey,
    recipient: &Pubkey,
    proof: &[u8],
) -> PodAIResult<Instruction> {
    // Find the escrow token account PDA
    let (escrow_token_pda, _) = Pubkey::find_program_address(
        &[b"escrow_token", escrow_pda.as_ref()],
        &crate::PROGRAM_ID,
    );

    let accounts = vec![
        AccountMeta::new(*escrow_pda, false),
        AccountMeta::new(escrow_token_pda, false),
        AccountMeta::new(*releaser, true),
        AccountMeta::new(*recipient, false),
        AccountMeta::new_readonly(spl_token::id(), false),
    ];

    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&RELEASE_ESCROW_DISCRIMINATOR);
    
    let args = ReleaseEscrowInstructionData {
        proof: proof.to_vec(),
    };
    
    args.serialize(&mut instruction_data)
        .map_err(|e| PodAIError::SerializationError {
            message: format!("Failed to serialize release_escrow instruction: {}", e),
        })?;
    
    Ok(Instruction {
        program_id: crate::PROGRAM_ID,
        accounts,
        data: instruction_data,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_escrow_builder() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let signer = Keypair::new();
        let recipient = Keypair::new().pubkey();
        
        let builder = CreateEscrowBuilder::new(client)
            .signer(signer)
            .recipient(recipient)
            .amount(1_000_000_000) // 1 SOL
            .conditions_string("Complete AI task within 24 hours")
            .deadline(chrono::Utc::now().timestamp() + 86400);
        
        assert!(builder.validate_params().is_ok());
    }

    #[tokio::test]
    async fn test_release_escrow_builder() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let signer = Keypair::new();
        let escrow = Pubkey::new_unique();
        
        let builder = ReleaseEscrowBuilder::new(client)
            .signer(signer)
            .escrow(escrow)
            .proof_string("Task completed successfully");
        
        // Basic validation
        assert!(builder.escrow.is_some());
        assert!(builder.proof.is_some());
    }
}