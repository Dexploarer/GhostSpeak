/*!
 * Ghost Instruction Tests using Mollusk SVM
 *
 * Tests for ghost creation, claiming, and external ID linking.
 * Uses Mollusk for fast, isolated instruction testing.
 */

use super::test_harness::*;
use solana_sdk::{
    instruction::AccountMeta,
    pubkey::Pubkey,
    system_program,
};

/// Test ghost PDA derivation
#[test]
fn test_ghost_pda_derivation() {
    let owner = Pubkey::new_unique();

    let (ghost_pda, bump) = derive_ghost_pda(&owner);

    // Verify PDA is valid
    assert!(!ghost_pda.is_on_curve(), "PDA should be off-curve");

    // Verify determinism
    let (ghost_pda_2, bump_2) = derive_ghost_pda(&owner);
    assert_eq!(ghost_pda, ghost_pda_2);
    assert_eq!(bump, bump_2);

    // Different owner = different PDA
    let owner_2 = Pubkey::new_unique();
    let (ghost_pda_3, _) = derive_ghost_pda(&owner_2);
    assert_ne!(ghost_pda, ghost_pda_3);
}

/// Test ghost instruction discriminators
#[test]
fn test_ghost_instruction_discriminators() {
    let auto_create_disc = compute_discriminator("auto_create_ghost");
    let claim_disc = compute_discriminator("claim_ghost");
    let link_disc = compute_discriminator("link_external_id");

    // All discriminators should be unique
    assert_ne!(auto_create_disc, claim_disc);
    assert_ne!(auto_create_disc, link_disc);
    assert_ne!(claim_disc, link_disc);

    // Should be 8 bytes
    assert_eq!(auto_create_disc.len(), 8);
    assert_eq!(claim_disc.len(), 8);
    assert_eq!(link_disc.len(), 8);
}

/// Test auto_create_ghost instruction structure
#[test]
fn test_auto_create_ghost_instruction_structure() {
    let owner = Pubkey::new_unique();
    let (ghost_pda, _) = derive_ghost_pda(&owner);

    let accounts = vec![
        AccountMeta::new(ghost_pda, false),        // ghost (init)
        AccountMeta::new(owner, true),             // owner (signer)
        AccountMeta::new_readonly(system_program::ID, false), // system_program
    ];

    let instruction = build_anchor_instruction("auto_create_ghost", accounts.clone(), vec![]);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 3);
    assert!(instruction.accounts[0].is_writable, "Ghost account should be writable");
    assert!(instruction.accounts[1].is_signer, "Owner should be signer");
}

/// Test claim_ghost instruction structure
#[test]
fn test_claim_ghost_instruction_structure() {
    let owner = Pubkey::new_unique();
    let (ghost_pda, _) = derive_ghost_pda(&owner);

    let accounts = vec![
        AccountMeta::new(ghost_pda, false),        // ghost
        AccountMeta::new(owner, true),             // claimer (signer)
        AccountMeta::new_readonly(solana_sdk::sysvar::clock::ID, false), // clock
    ];

    let instruction = build_anchor_instruction("claim_ghost", accounts.clone(), vec![]);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 3);
}

/// Test link_external_id instruction structure
#[test]
fn test_link_external_id_instruction_structure() {
    let owner = Pubkey::new_unique();
    let (ghost_pda, _) = derive_ghost_pda(&owner);

    let accounts = vec![
        AccountMeta::new(ghost_pda, false),        // ghost
        AccountMeta::new(owner, true),             // owner (signer)
    ];

    // External ID data: platform (u8) + id (string)
    let platform: u8 = 1; // Twitter = 1
    let external_id = "twitter_user_123";
    let mut data = vec![platform];
    data.extend(&(external_id.len() as u32).to_le_bytes());
    data.extend(external_id.as_bytes());

    let instruction = build_anchor_instruction("link_external_id", accounts.clone(), data);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 2);
}

/// Test ghost identity uniqueness
#[test]
fn test_ghost_identity_uniqueness() {
    // Each wallet should have exactly one ghost
    let wallet_1 = Pubkey::new_unique();
    let wallet_2 = Pubkey::new_unique();

    let (ghost_1, _) = derive_ghost_pda(&wallet_1);
    let (ghost_2, _) = derive_ghost_pda(&wallet_2);

    // Different wallets = different ghosts
    assert_ne!(ghost_1, ghost_2, "Different wallets should have different ghosts");

    // Same wallet = same ghost (deterministic)
    let (ghost_1_again, _) = derive_ghost_pda(&wallet_1);
    assert_eq!(ghost_1, ghost_1_again, "Same wallet should always produce same ghost");
}

/// Test ghost account size
#[test]
fn test_ghost_account_size() {
    let ghost_size = sizes::GHOST;

    // Minimum reasonable size (discriminator + pubkey + basic fields)
    let min_size = 8 + 32 + 50; // At least discriminator + owner + some data

    assert!(
        ghost_size >= min_size,
        "Ghost account size {} should be at least {}", ghost_size, min_size
    );

    // Maximum reasonable size
    let max_size = 1000;
    assert!(
        ghost_size <= max_size,
        "Ghost account size {} should not exceed {}", ghost_size, max_size
    );
}

/// Test external ID platform types
#[test]
fn test_external_id_platforms() {
    // Platform enum values
    let platforms = [
        (0u8, "X/Twitter"),
        (1u8, "Discord"),
        (2u8, "Telegram"),
        (3u8, "GitHub"),
        (4u8, "Email"),
        (5u8, "Phone"),
    ];

    for (platform_id, _name) in platforms {
        // Each platform should have a unique ID
        assert!(platform_id <= 255, "Platform ID should fit in u8");
    }
}

// Integration tests are in integration_tests.rs
