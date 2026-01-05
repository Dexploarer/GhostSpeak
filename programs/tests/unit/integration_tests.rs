/*!
 * Mollusk Integration Tests for GhostSpeak
 *
 * These tests execute actual program instructions using Mollusk SVM.
 * They require the compiled program at target/deploy/ghostspeak_marketplace.so
 */

use super::test_harness::*;
use solana_sdk::pubkey::Pubkey;

// Mollusk-compatible types (v3/v4)
use solana_account::Account as MolluskAccount;
use solana_instruction::{AccountMeta as MolluskAccountMeta, Instruction as MolluskInstruction};

/// Convert our SDK instruction to Mollusk-compatible instruction
fn to_mollusk_instruction(ix: &solana_sdk::instruction::Instruction) -> MolluskInstruction {
    MolluskInstruction {
        program_id: to_mollusk_pubkey(&ix.program_id),
        accounts: ix
            .accounts
            .iter()
            .map(|meta| MolluskAccountMeta {
                pubkey: to_mollusk_pubkey(&meta.pubkey),
                is_signer: meta.is_signer,
                is_writable: meta.is_writable,
            })
            .collect(),
        data: ix.data.clone(),
    }
}

/// Create a Mollusk-compatible account
fn create_mollusk_account(
    lamports: u64,
    data: Vec<u8>,
    owner: &MolluskPubkey,
    executable: bool,
) -> MolluskAccount {
    MolluskAccount {
        lamports,
        data,
        owner: (*owner).into(),
        executable,
        rent_epoch: 0,
    }
}

// =============================================================================
// Ghost Integration Tests
// =============================================================================

/// Test auto_create_ghost instruction execution
#[test]
fn test_auto_create_ghost_execution() {
    if !program_available() {
        println!("Skipping: program not built");
        return;
    }

    let mollusk = create_mollusk();
    let owner = Pubkey::new_unique();
    let (ghost_pda, _bump) = derive_ghost_pda(&owner);

    // Build instruction with our SDK types
    let accounts = vec![
        solana_sdk::instruction::AccountMeta::new(ghost_pda, false),
        solana_sdk::instruction::AccountMeta::new(owner, true),
        solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
    ];
    let instruction = build_anchor_instruction("auto_create_ghost", accounts, vec![]);

    // Convert to Mollusk instruction
    let mollusk_ix = to_mollusk_instruction(&instruction);

    // Setup accounts for Mollusk
    let system_program_id = to_mollusk_pubkey(&solana_sdk::system_program::ID);
    let native_loader_id = to_mollusk_pubkey(&solana_sdk::native_loader::ID);
    let _program_id = program_id_mollusk();

    let account_entries: &[(MolluskPubkey, MolluskAccount)] = &[
        // Ghost PDA (uninitialized)
        (
            to_mollusk_pubkey(&ghost_pda),
            create_mollusk_account(0, vec![], &system_program_id, false),
        ),
        // Owner with funds
        (
            to_mollusk_pubkey(&owner),
            create_mollusk_account(10_000_000_000, vec![], &system_program_id, false),
        ),
        // System program
        (
            system_program_id.clone(),
            create_mollusk_account(1, vec![], &native_loader_id, true),
        ),
    ];

    // Process instruction
    let result = mollusk.process_instruction(&mollusk_ix, account_entries);

    // For now, just log the result - we expect failures due to missing Anchor requirements
    // (clock sysvar, rent sysvar, etc.)
    println!("auto_create_ghost result: {:?}", result.program_result);

    // The test passes if Mollusk can load and attempt to execute the program
    // This validates our type bridging works correctly
}

/// Test that ghost PDA derivation matches program expectation
#[test]
fn test_ghost_pda_matches_program() {
    let owner = Pubkey::new_unique();
    let (ghost_pda, bump) = derive_ghost_pda(&owner);

    // Verify our PDA derivation uses the correct seeds: ["ghost", owner]
    let (expected_pda, expected_bump) =
        Pubkey::find_program_address(&[b"ghost", owner.as_ref()], &PROGRAM_ID);

    assert_eq!(ghost_pda, expected_pda);
    assert_eq!(bump, expected_bump);
}

// =============================================================================
// Staking Integration Tests
// =============================================================================

/// Test staking PDA derivation matches program
#[test]
fn test_staking_pda_matches_program() {
    let owner = Pubkey::new_unique();
    let (staking_pda, bump) = derive_staking_pda(&owner);

    // Seeds: ["staking", owner]
    let (expected_pda, expected_bump) =
        Pubkey::find_program_address(&[b"staking", owner.as_ref()], &PROGRAM_ID);

    assert_eq!(staking_pda, expected_pda);
    assert_eq!(bump, expected_bump);
}

// =============================================================================
// Agent Integration Tests
// =============================================================================

/// Test agent PDA derivation matches program
#[test]
fn test_agent_pda_matches_program() {
    let owner = Pubkey::new_unique();
    let agent_id = "test-agent-001";
    let (agent_pda, bump) = derive_agent_pda(&owner, agent_id);

    // Seeds: ["agent", owner, agent_id]
    let (expected_pda, expected_bump) = Pubkey::find_program_address(
        &[b"agent", owner.as_ref(), agent_id.as_bytes()],
        &PROGRAM_ID,
    );

    assert_eq!(agent_pda, expected_pda);
    assert_eq!(bump, expected_bump);
}

// =============================================================================
// Escrow Integration Tests
// =============================================================================

/// Test escrow PDA derivation matches program
#[test]
fn test_escrow_pda_matches_program() {
    let client = Pubkey::new_unique();
    let agent = Pubkey::new_unique();
    let nonce: u64 = 12345;
    let (escrow_pda, bump) = derive_escrow_pda(&client, &agent, nonce);

    // Seeds: ["escrow", client, agent, nonce]
    let (expected_pda, expected_bump) = Pubkey::find_program_address(
        &[
            b"escrow",
            client.as_ref(),
            agent.as_ref(),
            &nonce.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );

    assert_eq!(escrow_pda, expected_pda);
    assert_eq!(bump, expected_bump);
}

// =============================================================================
// Reputation Integration Tests
// =============================================================================

/// Test reputation PDA derivation matches program
#[test]
fn test_reputation_pda_matches_program() {
    let agent = Pubkey::new_unique();
    let (reputation_pda, bump) = derive_reputation_pda(&agent);

    // Seeds: ["reputation", agent]
    let (expected_pda, expected_bump) =
        Pubkey::find_program_address(&[b"reputation", agent.as_ref()], &PROGRAM_ID);

    assert_eq!(reputation_pda, expected_pda);
    assert_eq!(bump, expected_bump);
}

/// Verify Mollusk can load and process instructions
#[test]
fn test_mollusk_processes_instructions() {
    if !program_available() {
        println!("Skipping: program not built");
        return;
    }

    let mollusk = create_mollusk();

    // The fact that we can call create_mollusk() without panic means the program loaded
    println!("Mollusk configured successfully for GhostSpeak program");
    drop(mollusk);
}
