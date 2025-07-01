pub mod agent;
pub mod channel;
pub mod escrow;
pub mod marketplace;
pub mod message;

use async_trait::async_trait;
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
};

use crate::errors::{PodAIError, PodAIResult};

/// Trait for instruction builders that can generate Solana instructions
#[async_trait]
pub trait InstructionBuilder {
    /// Build the instruction(s) for this operation
    async fn build(&self) -> PodAIResult<Vec<Instruction>>;
    
    /// Get the payer for the transaction
    fn payer(&self) -> Pubkey;
    
    /// Get all signers required for this instruction
    fn signers(&self) -> Vec<&Keypair>;
    
    /// Get the instruction type name for error reporting
    fn instruction_type(&self) -> &'static str;
    
    /// Validate the instruction parameters
    fn validate(&self) -> PodAIResult<()> {
        Ok(())
    }
}

/// Result of instruction building with metadata
#[derive(Debug, Clone)]
pub struct InstructionBuildResult {
    pub instructions: Vec<Instruction>,
    pub signers: Vec<Pubkey>,
    pub payer: Pubkey,
    pub estimated_compute_units: Option<u32>,
}

/// Helper trait for instruction builders that need to estimate compute units
pub trait ComputeUnitEstimator {
    fn estimate_compute_units(&self) -> u32 {
        200_000 // Conservative default
    }
}

/// Macro to implement basic instruction builder methods
#[macro_export]
macro_rules! impl_instruction_builder_basics {
    ($struct_name:ident, $instruction_type:literal, $payer_field:ident) => {
        impl $struct_name {
            pub fn instruction_type(&self) -> &'static str {
                $instruction_type
            }
            
            pub fn payer(&self) -> Pubkey {
                self.$payer_field.pubkey()
            }
        }
    };
}

pub use impl_instruction_builder_basics; 