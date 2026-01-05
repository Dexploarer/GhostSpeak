/*!
 * Mollusk Test Harness for GhostSpeak
 *
 * Common utilities for testing Anchor instructions with Mollusk SVM.
 * Provides helpers for:
 * - Anchor instruction serialization with discriminators
 * - PDA derivation
 * - Account setup utilities
 * - Mollusk integration testing
 */

use mollusk_svm::Mollusk;
use sha2::{Digest, Sha256};
use solana_sdk::{
    account::AccountSharedData,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    rent::Rent,
    system_program,
};
use std::path::Path;

// Re-export the v4 Pubkey type for Mollusk integration
pub use solana_pubkey::Pubkey as MolluskPubkey;

/// GhostSpeak program ID (from declare_id! in lib.rs)
pub const PROGRAM_ID: Pubkey = solana_sdk::pubkey!("4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB");

/// Program ID as v4 Pubkey for Mollusk
pub fn program_id_mollusk() -> MolluskPubkey {
    MolluskPubkey::from(PROGRAM_ID.to_bytes())
}

/// Convert our Pubkey (v2.3) to Mollusk's Pubkey type (v4)
pub fn to_mollusk_pubkey(pubkey: &Pubkey) -> MolluskPubkey {
    MolluskPubkey::from(pubkey.to_bytes())
}

/// Path to compiled program (Mollusk appends .so automatically)
const PROGRAM_PATH: &str = "target/deploy/ghostspeak_marketplace";

/// Create a Mollusk instance with the GhostSpeak program loaded
pub fn create_mollusk() -> Mollusk {
    let program_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join(PROGRAM_PATH);

    let program_id = program_id_mollusk();
    Mollusk::new(&program_id, program_path.to_str().unwrap())
}

/// Check if the program is available for integration tests
pub fn program_available() -> bool {
    let program_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join(format!("{}.so", PROGRAM_PATH));
    program_path.exists()
}

/// Compute Anchor instruction discriminator (first 8 bytes of sha256("global:<instruction_name>"))
pub fn compute_discriminator(instruction_name: &str) -> [u8; 8] {
    let preimage = format!("global:{}", instruction_name);
    let mut hasher = Sha256::new();
    hasher.update(preimage.as_bytes());
    let result = hasher.finalize();
    let mut discriminator = [0u8; 8];
    discriminator.copy_from_slice(&result[..8]);
    discriminator
}

/// Derive PDA for agent account
pub fn derive_agent_pda(owner: &Pubkey, agent_id: &str) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"agent", owner.as_ref(), agent_id.as_bytes()],
        &PROGRAM_ID,
    )
}

/// Derive PDA for staking account
pub fn derive_staking_pda(owner: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"staking", owner.as_ref()], &PROGRAM_ID)
}

/// Derive PDA for ghost account
pub fn derive_ghost_pda(owner: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"ghost", owner.as_ref()], &PROGRAM_ID)
}

/// Derive PDA for reputation metrics
pub fn derive_reputation_pda(agent: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"reputation", agent.as_ref()], &PROGRAM_ID)
}

/// Derive PDA for escrow account
pub fn derive_escrow_pda(client: &Pubkey, agent: &Pubkey, nonce: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            b"escrow",
            client.as_ref(),
            agent.as_ref(),
            &nonce.to_le_bytes(),
        ],
        &PROGRAM_ID,
    )
}

/// Build an Anchor instruction with proper discriminator
pub fn build_anchor_instruction(
    instruction_name: &str,
    accounts: Vec<AccountMeta>,
    data: Vec<u8>,
) -> Instruction {
    let discriminator = compute_discriminator(instruction_name);
    let mut instruction_data = discriminator.to_vec();
    instruction_data.extend(data);

    Instruction::new_with_bytes(PROGRAM_ID, &instruction_data, accounts)
}

/// Account sizes for GhostSpeak accounts (manually defined to avoid crate dependency)
pub mod sizes {
    /// Agent account size (based on Agent::LEN in state/agent.rs)
    pub const AGENT: usize = 8 + 32 + 68 + 68 + 260 + 260 + 50 + 1 + 40 + 16 + 260 + 1;

    /// Staking account size (based on StakingAccount::SPACE)
    #[allow(dead_code)]
    pub const STAKING: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 8 + 4 + 1;

    /// Ghost account size (based on Ghost struct)
    pub const GHOST: usize = 8 + 32 + 68 + 8 + 8 + 8 + 8 + 1 + 1;

    /// Reputation metrics size
    #[allow(dead_code)]
    pub const REPUTATION: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1;
}

/// Create a funded signer account
pub fn create_signer_account(lamports: u64) -> AccountSharedData {
    AccountSharedData::new(lamports, 0, &system_program::ID)
}

/// Create an uninitialized PDA account with rent-exempt balance
pub fn create_pda_account(size: usize) -> AccountSharedData {
    let rent = Rent::default();
    let lamports = rent.minimum_balance(size);
    AccountSharedData::new(lamports, size, &PROGRAM_ID)
}

/// Create the system program account
#[allow(dead_code)]
pub fn system_program_account() -> (Pubkey, AccountSharedData) {
    (
        system_program::ID,
        AccountSharedData::new(1, 0, &solana_sdk::native_loader::ID),
    )
}

#[cfg(test)]
mod harness_tests {
    use super::*;
    use solana_sdk::account::ReadableAccount;

    #[test]
    fn test_discriminator_computation() {
        // Test that discriminator computation works
        let disc = compute_discriminator("register_agent");
        assert_eq!(disc.len(), 8);
        assert_ne!(disc, [0u8; 8]); // Should not be all zeros
    }

    #[test]
    fn test_pda_derivation() {
        let owner = Pubkey::new_unique();
        let agent_id = "test-agent-1";

        let (pda, _bump) = derive_agent_pda(&owner, agent_id);
        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_program_available() {
        let available = program_available();
        println!("Program available: {}", available);
        // This test passes regardless - it just reports status
    }

    #[test]
    fn test_create_accounts() {
        let signer = create_signer_account(1_000_000_000);
        assert!(signer.lamports() >= 1_000_000_000);

        let pda = create_pda_account(sizes::GHOST);
        assert_eq!(pda.data().len(), sizes::GHOST);
    }

    #[test]
    fn test_pubkey_conversion() {
        let sdk_pubkey = Pubkey::new_unique();
        let mollusk_pubkey = to_mollusk_pubkey(&sdk_pubkey);

        // Both should have the same bytes
        assert_eq!(sdk_pubkey.to_bytes(), mollusk_pubkey.to_bytes());
    }

    #[test]
    fn test_mollusk_loads() {
        if !program_available() {
            println!("Skipping: program not built");
            return;
        }

        let mollusk = create_mollusk();
        // If we get here without panicking, Mollusk loaded successfully
        println!("Mollusk loaded program successfully");
        drop(mollusk);
    }
}
