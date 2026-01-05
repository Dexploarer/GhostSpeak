/*!
 * Agent Instruction Tests using Mollusk SVM
 *
 * Tests for agent registration, updates, and status management.
 * Uses Mollusk for fast, isolated instruction testing.
 */

use super::test_harness::*;
use solana_sdk::{instruction::AccountMeta, pubkey::Pubkey, system_program};

/// Test agent registration instruction structure
#[test]
fn test_register_agent_accounts_structure() {
    // Verify the account structure for RegisterAgent
    let signer = Pubkey::new_unique();
    let agent_id = "test-agent-1";

    // Derive PDAs
    let (agent_pda, _agent_bump) = derive_agent_pda(&signer, agent_id);
    let (staking_pda, _staking_bump) = derive_staking_pda(&signer);

    // Verify PDA derivations are deterministic
    let (agent_pda_2, _) = derive_agent_pda(&signer, agent_id);
    assert_eq!(agent_pda, agent_pda_2, "Agent PDA should be deterministic");

    let (staking_pda_2, _) = derive_staking_pda(&signer);
    assert_eq!(
        staking_pda, staking_pda_2,
        "Staking PDA should be deterministic"
    );

    // Different agent IDs should produce different PDAs
    let (agent_pda_different, _) = derive_agent_pda(&signer, "different-agent");
    assert_ne!(
        agent_pda, agent_pda_different,
        "Different agent IDs should have different PDAs"
    );
}

/// Test agent discriminator computation
#[test]
fn test_agent_instruction_discriminators() {
    // Verify discriminator computation for agent instructions
    let register_disc = compute_discriminator("register_agent");
    let update_disc = compute_discriminator("update_agent");
    let status_disc = compute_discriminator("update_agent_status");

    // Discriminators should be unique
    assert_ne!(
        register_disc, update_disc,
        "register and update should have different discriminators"
    );
    assert_ne!(
        update_disc, status_disc,
        "update and status should have different discriminators"
    );
    assert_ne!(
        register_disc, status_disc,
        "register and status should have different discriminators"
    );

    // Discriminators should be 8 bytes and non-zero
    assert_eq!(register_disc.len(), 8);
    assert_ne!(register_disc, [0u8; 8]);
}

/// Test agent PDA collision prevention
#[test]
fn test_agent_pda_collision_prevention() {
    // Same owner, same agent_id = same PDA (collision)
    let owner = Pubkey::new_unique();
    let agent_id = "my-agent";

    let (pda1, bump1) = derive_agent_pda(&owner, agent_id);
    let (pda2, bump2) = derive_agent_pda(&owner, agent_id);

    assert_eq!(pda1, pda2, "Same seeds should produce same PDA");
    assert_eq!(bump1, bump2, "Same seeds should produce same bump");

    // Different owner, same agent_id = different PDA
    let owner2 = Pubkey::new_unique();
    let (pda3, _) = derive_agent_pda(&owner2, agent_id);

    assert_ne!(pda1, pda3, "Different owners should have different PDAs");

    // Same owner, different agent_id = different PDA
    let (pda4, _) = derive_agent_pda(&owner, "different-agent");

    assert_ne!(pda1, pda4, "Different agent IDs should have different PDAs");
}

/// Test agent account size calculation
#[test]
fn test_agent_account_size() {
    // Agent::LEN should be sufficient for the account data
    let agent_size = sizes::AGENT;

    // Minimum reasonable size (discriminator + pubkey + basic fields)
    let min_size = 8 + 32 + 100; // At least discriminator + owner + some data

    assert!(
        agent_size >= min_size,
        "Agent account size {} should be at least {}",
        agent_size,
        min_size
    );

    // Maximum reasonable size (shouldn't be excessively large)
    let max_size = 10_000;
    assert!(
        agent_size <= max_size,
        "Agent account size {} should not exceed {}",
        agent_size,
        max_size
    );
}

/// Test staking requirement for agent registration
#[test]
fn test_staking_requirement_structure() {
    // Verify staking PDA structure for agent registration
    let owner = Pubkey::new_unique();

    let (staking_pda, _bump) = derive_staking_pda(&owner);

    // Bump should be valid
    // assert!(bump <= 255); // Redundant for u8

    // PDA should be off-curve (cannot sign)
    assert!(
        staking_pda.is_on_curve() == false,
        "Staking PDA should be off the Ed25519 curve"
    );
}

/// Test instruction data serialization for register_agent
#[test]
fn test_register_agent_instruction_data() {
    // Build instruction data for register_agent
    // Args: agent_type: u8, name: String, description: String, metadata_uri: String, agent_id: String, pricing_model: PricingModel

    let agent_type: u8 = 1; // Some agent type
    let name = "Test Agent";
    let _description = "A test agent for unit testing";
    let _metadata_uri = "https://example.com/metadata.json";
    let agent_id = "test-agent-001";

    // Serialize instruction data (simplified - actual Anchor serialization is more complex)
    let mut data = Vec::new();
    data.push(agent_type);
    // In real Anchor, strings are serialized with length prefix
    data.extend(&(name.len() as u32).to_le_bytes());
    data.extend(name.as_bytes());

    // Verify data is non-empty
    assert!(!data.is_empty(), "Instruction data should not be empty");

    // Build the full instruction
    let signer = Pubkey::new_unique();
    let (agent_pda, _) = derive_agent_pda(&signer, agent_id);
    let (staking_pda, _) = derive_staking_pda(&signer);

    let accounts = vec![
        AccountMeta::new(agent_pda, false), // agent_account (init, writable)
        AccountMeta::new_readonly(staking_pda, false), // staking_account (readonly)
        AccountMeta::new(signer, true),     // signer (mut, signer)
        AccountMeta::new_readonly(system_program::ID, false), // system_program
        AccountMeta::new_readonly(solana_sdk::sysvar::clock::ID, false), // clock
    ];

    let instruction = build_anchor_instruction("register_agent", accounts.clone(), data);

    // Verify instruction structure
    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 5);
    assert!(
        instruction.data.len() >= 8,
        "Should have at least discriminator"
    );
}

/// Test update_agent instruction structure
#[test]
fn test_update_agent_instruction_structure() {
    let signer = Pubkey::new_unique();
    let agent_id = "test-agent-001";

    let (agent_pda, _) = derive_agent_pda(&signer, agent_id);

    let accounts = vec![
        AccountMeta::new(agent_pda, false), // agent_account (mut)
        AccountMeta::new(signer, true),     // signer (mut, signer)
        AccountMeta::new_readonly(solana_sdk::sysvar::clock::ID, false), // clock
    ];

    // Build update instruction with empty data (just discriminator)
    let instruction = build_anchor_instruction("update_agent", accounts.clone(), vec![]);

    // Verify instruction structure
    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 3);

    // Verify account metas
    assert!(
        instruction.accounts[0].is_writable,
        "Agent account should be writable"
    );
    assert!(
        instruction.accounts[1].is_signer,
        "Signer should be marked as signer"
    );
}

/// Test update_agent_status instruction structure
#[test]
fn test_update_agent_status_instruction_structure() {
    let signer = Pubkey::new_unique();
    let agent_id = "test-agent-001";

    let (agent_pda, _) = derive_agent_pda(&signer, agent_id);

    let accounts = vec![
        AccountMeta::new(agent_pda, false), // agent_account (mut)
        AccountMeta::new(signer, true),     // signer (mut, signer)
        AccountMeta::new_readonly(solana_sdk::sysvar::clock::ID, false), // clock
    ];

    let instruction = build_anchor_instruction("update_agent_status", accounts.clone(), vec![]);

    assert_eq!(instruction.program_id, PROGRAM_ID);
    assert_eq!(instruction.accounts.len(), 3);
}

// Integration tests are in integration_tests.rs
