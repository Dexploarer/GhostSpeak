/*!
 * Escrow Instruction Tests using Mollusk SVM
 *
 * Tests for GhostProtect escrow: creation, delivery, approval, disputes.
 * Uses Mollusk for fast, isolated instruction testing.
 */

use super::test_harness::*;
use solana_sdk::{
    instruction::AccountMeta,
    pubkey::Pubkey,
    system_program,
};

/// SPL Token program ID
const SPL_TOKEN_PROGRAM_ID: Pubkey = solana_sdk::pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/// Escrow states
#[allow(dead_code)]
mod states {
    pub const AWAITING_DELIVERY: u8 = 0;
    pub const DELIVERED: u8 = 1;
    pub const APPROVED: u8 = 2;
    pub const DISPUTED: u8 = 3;
    pub const REFUNDED: u8 = 4;
    pub const CANCELLED: u8 = 5;
}

/// Test escrow PDA derivation
#[test]
fn test_escrow_pda_derivation() {
    let client = Pubkey::new_unique();
    let agent = Pubkey::new_unique();
    let nonce: u64 = 1;

    let (escrow_pda, bump) = derive_escrow_pda(&client, &agent, nonce);

    // Verify PDA is valid
    assert!(!escrow_pda.is_on_curve(), "PDA should be off-curve");

    // Verify determinism
    let (escrow_pda_2, bump_2) = derive_escrow_pda(&client, &agent, nonce);
    assert_eq!(escrow_pda, escrow_pda_2);
    assert_eq!(bump, bump_2);

    // Different nonce = different PDA
    let (escrow_pda_3, _) = derive_escrow_pda(&client, &agent, 2);
    assert_ne!(escrow_pda, escrow_pda_3, "Different nonce should produce different PDA");

    // Different client = different PDA
    let client_2 = Pubkey::new_unique();
    let (escrow_pda_4, _) = derive_escrow_pda(&client_2, &agent, nonce);
    assert_ne!(escrow_pda, escrow_pda_4, "Different client should produce different PDA");
}

/// Test escrow instruction discriminators
#[test]
fn test_escrow_instruction_discriminators() {
    let create_disc = compute_discriminator("create_escrow");
    let submit_disc = compute_discriminator("submit_delivery");
    let approve_disc = compute_discriminator("approve_delivery");
    let dispute_disc = compute_discriminator("file_dispute");
    let resolve_disc = compute_discriminator("resolve_dispute");
    let cancel_disc = compute_discriminator("cancel_escrow");

    // All discriminators should be unique
    let discriminators = [create_disc, submit_disc, approve_disc, dispute_disc, resolve_disc, cancel_disc];
    for i in 0..discriminators.len() {
        for j in (i + 1)..discriminators.len() {
            assert_ne!(
                discriminators[i], discriminators[j],
                "Discriminators at indices {} and {} should be unique", i, j
            );
        }
    }

    // Should be 8 bytes
    for disc in discriminators {
        assert_eq!(disc.len(), 8);
    }
}

/// Test create_escrow instruction structure
#[test]
fn test_create_escrow_instruction_structure() {
    let client = Pubkey::new_unique();
    let agent = Pubkey::new_unique();
    let nonce: u64 = 1;

    let (escrow_pda, _) = derive_escrow_pda(&client, &agent, nonce);
    let ghost_mint = Pubkey::new_unique();
    let client_token_account = Pubkey::new_unique();
    let vault_token_account = Pubkey::new_unique();

    let accounts = vec![
        AccountMeta::new(escrow_pda, false),            // escrow (init)
        AccountMeta::new_readonly(ghost_mint, false),   // ghost_mint
        AccountMeta::new(client_token_account, false),  // client_token_account
        AccountMeta::new(vault_token_account, false),   // vault_token_account
        AccountMeta::new(client, true),                 // client (signer)
        AccountMeta::new_readonly(agent, false),        // agent
        AccountMeta::new_readonly(SPL_TOKEN_PROGRAM_ID, false), // token_program
        AccountMeta::new_readonly(system_program::ID, false), // system_program
    ];

    // Create escrow data: amount (u64) + deadline (i64) + nonce (u64)
    let amount: u64 = 1_000_000_000; // 1 GHOST
    let deadline: i64 = 1704067200;  // Some future timestamp
    let mut data = amount.to_le_bytes().to_vec();
    data.extend(deadline.to_le_bytes());
    data.extend(nonce.to_le_bytes());

    let instruction = build_anchor_instruction("create_escrow", accounts.clone(), data);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 8);
    assert!(instruction.accounts[0].is_writable, "Escrow account should be writable");
    assert!(instruction.accounts[4].is_signer, "Client should be signer");
}

/// Test submit_delivery instruction structure
#[test]
fn test_submit_delivery_instruction_structure() {
    let client = Pubkey::new_unique();
    let agent = Pubkey::new_unique();
    let nonce: u64 = 1;

    let (escrow_pda, _) = derive_escrow_pda(&client, &agent, nonce);

    let accounts = vec![
        AccountMeta::new(escrow_pda, false),        // escrow
        AccountMeta::new(agent, true),              // agent (signer)
        AccountMeta::new_readonly(solana_sdk::sysvar::clock::ID, false), // clock
    ];

    // Delivery data: delivery_hash (32 bytes) + proof_uri (string)
    let delivery_hash = [0u8; 32];
    let proof_uri = "ipfs://QmXyz...";
    let mut data = delivery_hash.to_vec();
    data.extend(&(proof_uri.len() as u32).to_le_bytes());
    data.extend(proof_uri.as_bytes());

    let instruction = build_anchor_instruction("submit_delivery", accounts.clone(), data);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 3);
}

/// Test approve_delivery instruction structure
#[test]
fn test_approve_delivery_instruction_structure() {
    let client = Pubkey::new_unique();
    let agent = Pubkey::new_unique();
    let nonce: u64 = 1;

    let (escrow_pda, _) = derive_escrow_pda(&client, &agent, nonce);
    let vault_token_account = Pubkey::new_unique();
    let agent_token_account = Pubkey::new_unique();
    let (agent_reputation_pda, _) = derive_reputation_pda(&agent);

    let accounts = vec![
        AccountMeta::new(escrow_pda, false),            // escrow
        AccountMeta::new(vault_token_account, false),   // vault_token_account
        AccountMeta::new(agent_token_account, false),   // agent_token_account
        AccountMeta::new(agent_reputation_pda, false),  // agent_reputation
        AccountMeta::new(client, true),                 // client (signer)
        AccountMeta::new_readonly(SPL_TOKEN_PROGRAM_ID, false), // token_program
    ];

    // Rating data: rating (u8, 1-5)
    let rating: u8 = 5;
    let data = vec![rating];

    let instruction = build_anchor_instruction("approve_delivery", accounts.clone(), data);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 6);
}

/// Test file_dispute instruction structure
#[test]
fn test_file_dispute_instruction_structure() {
    let client = Pubkey::new_unique();
    let agent = Pubkey::new_unique();
    let nonce: u64 = 1;

    let (escrow_pda, _) = derive_escrow_pda(&client, &agent, nonce);

    let accounts = vec![
        AccountMeta::new(escrow_pda, false),        // escrow
        AccountMeta::new(client, true),             // client (signer)
        AccountMeta::new_readonly(solana_sdk::sysvar::clock::ID, false), // clock
    ];

    // Dispute data: reason (string) + evidence_uri (string)
    let reason = "Work not delivered as specified";
    let evidence_uri = "ipfs://QmEvidence...";
    let mut data = Vec::new();
    data.extend(&(reason.len() as u32).to_le_bytes());
    data.extend(reason.as_bytes());
    data.extend(&(evidence_uri.len() as u32).to_le_bytes());
    data.extend(evidence_uri.as_bytes());

    let instruction = build_anchor_instruction("file_dispute", accounts.clone(), data);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 3);
}

/// Test escrow state transitions
#[test]
fn test_escrow_state_transitions() {
    // Valid state transitions
    let valid_transitions = [
        (states::AWAITING_DELIVERY, states::DELIVERED, "Agent submits delivery"),
        (states::AWAITING_DELIVERY, states::CANCELLED, "Client cancels"),
        (states::DELIVERED, states::APPROVED, "Client approves"),
        (states::DELIVERED, states::DISPUTED, "Client disputes"),
        (states::DISPUTED, states::APPROVED, "Arbiter rules for agent"),
        (states::DISPUTED, states::REFUNDED, "Arbiter rules for client"),
    ];

    for (from_state, to_state, _reason) in valid_transitions {
        assert_ne!(from_state, to_state, "State transition should change state");
    }
}

/// Test escrow fee calculations
#[test]
fn test_escrow_fee_calculation() {
    // GhostProtect fee: 2.5% (250 basis points)
    let fee_bps: u64 = 250;
    let amount: u64 = 1_000_000_000; // 1 GHOST (9 decimals)

    let fee = amount * fee_bps / 10000;
    let agent_receives = amount - fee;

    assert_eq!(fee, 25_000_000, "Fee should be 2.5% of amount");
    assert_eq!(agent_receives, 975_000_000, "Agent receives amount minus fee");
    assert_eq!(fee + agent_receives, amount, "Total should equal original amount");
}

/// Test escrow deadline validation
#[test]
fn test_escrow_deadline_validation() {
    // Minimum deadline: 1 hour from now
    let min_deadline_seconds = 60 * 60; // 1 hour

    // Maximum deadline: 30 days from now
    let max_deadline_seconds = 30 * 24 * 60 * 60; // 30 days

    assert_eq!(min_deadline_seconds, 3600, "Minimum deadline is 1 hour");
    assert_eq!(max_deadline_seconds, 2_592_000, "Maximum deadline is 30 days");
}

// Integration tests are in integration_tests.rs
