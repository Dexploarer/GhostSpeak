use anchor_lang::prelude::*;
use solana_sdk::{signature::Keypair, signer::Signer};
use crate::state::*;
use crate::instructions::*;
use crate::tests::helpers::{TestEnvironment, assertions, constants};

#[tokio::test]
async fn test_agent_create_success() {
    let mut env = TestEnvironment::new().await;
    let owner = Keypair::new();
    
    // Fund the owner account
    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[solana_sdk::system_instruction::transfer(
                &env.context.payer.pubkey(),
                &owner.pubkey(),
                1_000_000_000,
            )],
            Some(&env.context.payer.pubkey()),
            &[&env.context.payer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Create agent
    let service_types = vec!["coding".to_string(), "writing".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types.clone()).await.unwrap();
    
    // Verify agent was created correctly
    let agent: Agent = env.get_account(agent_pda).await.unwrap();
    assertions::assert_agent_created(&agent, owner.pubkey(), &service_types);
}

#[tokio::test]
async fn test_agent_create_with_invalid_service_types() {
    let mut env = TestEnvironment::new().await;
    let owner = Keypair::new();
    
    // Fund the owner account
    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[solana_sdk::system_instruction::transfer(
                &env.context.payer.pubkey(),
                &owner.pubkey(),
                1_000_000_000,
            )],
            Some(&env.context.payer.pubkey()),
            &[&env.context.payer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Try to create agent with empty service types
    let result = env.create_test_agent(&owner, vec![]).await;
    assert!(result.is_err(), "Should fail with empty service types");
}

#[tokio::test]
async fn test_agent_update_metadata() {
    let mut env = TestEnvironment::new().await;
    let owner = Keypair::new();
    
    // Fund the owner account
    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[solana_sdk::system_instruction::transfer(
                &env.context.payer.pubkey(),
                &owner.pubkey(),
                1_000_000_000,
            )],
            Some(&env.context.payer.pubkey()),
            &[&env.context.payer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Create agent
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    
    // Update metadata
    let new_metadata_uri = "https://updated.metadata.uri".to_string();
    let ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(owner.pubkey(), true),
        ],
        data: UpdateAgentMetadataParams {
            new_metadata_uri: new_metadata_uri.clone(),
        }
        .try_to_vec()
        .unwrap(),
    };

    let tx = solana_sdk::transaction::Transaction::new_signed_with_payer(
        &[ix],
        Some(&owner.pubkey()),
        &[&owner],
        env.context.last_blockhash,
    );

    env.context.banks_client.process_transaction(tx).await.unwrap();
    
    // Verify update
    let agent: Agent = env.get_account(agent_pda).await.unwrap();
    assert_eq!(agent.metadata_uri, new_metadata_uri);
}

#[tokio::test]
async fn test_agent_update_by_non_owner_fails() {
    let mut env = TestEnvironment::new().await;
    let owner = Keypair::new();
    let attacker = Keypair::new();
    
    // Fund both accounts
    for account in &[&owner, &attacker] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[solana_sdk::system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    1_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Create agent
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    
    // Try to update with non-owner
    let new_metadata_uri = "https://malicious.metadata.uri".to_string();
    let ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(attacker.pubkey(), true),
        ],
        data: UpdateAgentMetadataParams {
            new_metadata_uri,
        }
        .try_to_vec()
        .unwrap(),
    };

    let tx = solana_sdk::transaction::Transaction::new_signed_with_payer(
        &[ix],
        Some(&attacker.pubkey()),
        &[&attacker],
        env.context.last_blockhash,
    );

    let result = env.context.banks_client.process_transaction(tx).await;
    assert!(result.is_err(), "Should fail when non-owner tries to update");
}

#[tokio::test]
async fn test_agent_verify() {
    let mut env = TestEnvironment::new().await;
    let owner = Keypair::new();
    
    // Fund the owner account
    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[solana_sdk::system_instruction::transfer(
                &env.context.payer.pubkey(),
                &owner.pubkey(),
                1_000_000_000,
            )],
            Some(&env.context.payer.pubkey()),
            &[&env.context.payer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Create agent
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    
    // Verify agent (using platform signer)
    let ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(env.platform_signer.pubkey(), true),
        ],
        data: VerifyAgentParams {}.try_to_vec().unwrap(),
    };

    let tx = solana_sdk::transaction::Transaction::new_signed_with_payer(
        &[ix],
        Some(&env.platform_signer.pubkey()),
        &[&env.platform_signer],
        env.context.last_blockhash,
    );

    env.context.banks_client.process_transaction(tx).await.unwrap();
    
    // Check verification status
    let agent: Agent = env.get_account(agent_pda).await.unwrap();
    assert!(agent.is_verified);
}

#[tokio::test]
async fn test_agent_deactivate() {
    let mut env = TestEnvironment::new().await;
    let owner = Keypair::new();
    
    // Fund the owner account
    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[solana_sdk::system_instruction::transfer(
                &env.context.payer.pubkey(),
                &owner.pubkey(),
                1_000_000_000,
            )],
            Some(&env.context.payer.pubkey()),
            &[&env.context.payer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Create agent
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    
    // Deactivate agent
    let ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(owner.pubkey(), true),
        ],
        data: DeactivateAgentParams {}.try_to_vec().unwrap(),
    };

    let tx = solana_sdk::transaction::Transaction::new_signed_with_payer(
        &[ix],
        Some(&owner.pubkey()),
        &[&owner],
        env.context.last_blockhash,
    );

    env.context.banks_client.process_transaction(tx).await.unwrap();
    
    // Check deactivation status
    let agent: Agent = env.get_account(agent_pda).await.unwrap();
    assert!(!agent.is_active);
}

#[tokio::test]
async fn test_agent_lifecycle_complete() {
    let mut env = TestEnvironment::new().await;
    let owner = Keypair::new();
    
    // Fund the owner account
    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[solana_sdk::system_instruction::transfer(
                &env.context.payer.pubkey(),
                &owner.pubkey(),
                1_000_000_000,
            )],
            Some(&env.context.payer.pubkey()),
            &[&env.context.payer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 1. Create agent
    let service_types = vec!["coding".to_string(), "writing".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types.clone()).await.unwrap();
    
    let agent: Agent = env.get_account(agent_pda).await.unwrap();
    assertions::assert_agent_created(&agent, owner.pubkey(), &service_types);
    
    // 2. Update metadata
    let new_metadata_uri = "https://updated.metadata.uri".to_string();
    let update_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(owner.pubkey(), true),
        ],
        data: UpdateAgentMetadataParams {
            new_metadata_uri: new_metadata_uri.clone(),
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[update_ix],
            Some(&owner.pubkey()),
            &[&owner],
            env.context.last_blockhash,
        )
    ).await.unwrap();
    
    // 3. Verify agent
    let verify_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(env.platform_signer.pubkey(), true),
        ],
        data: VerifyAgentParams {}.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&env.platform_signer.pubkey()),
            &[&env.platform_signer],
            env.context.last_blockhash,
        )
    ).await.unwrap();
    
    // 4. Deactivate agent
    let deactivate_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(owner.pubkey(), true),
        ],
        data: DeactivateAgentParams {}.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deactivate_ix],
            Some(&owner.pubkey()),
            &[&owner],
            env.context.last_blockhash,
        )
    ).await.unwrap();
    
    // Final verification
    let final_agent: Agent = env.get_account(agent_pda).await.unwrap();
    assert_eq!(final_agent.metadata_uri, new_metadata_uri);
    assert!(final_agent.is_verified);
    assert!(!final_agent.is_active);
}

#[tokio::test]
async fn test_agent_tier_upgrade() {
    let mut env = TestEnvironment::new().await;
    let owner = Keypair::new();
    
    // Fund the owner account
    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[solana_sdk::system_instruction::transfer(
                &env.context.payer.pubkey(),
                &owner.pubkey(),
                1_000_000_000,
            )],
            Some(&env.context.payer.pubkey()),
            &[&env.context.payer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Create basic tier agent
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    
    let agent: Agent = env.get_account(agent_pda).await.unwrap();
    assert_eq!(agent.tier, AgentTier::Basic);
    
    // Upgrade to Pro tier
    let upgrade_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new(owner.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(env.treasury, false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: UpgradeAgentTierParams {
            new_tier: AgentTier::Pro,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[upgrade_ix],
            Some(&owner.pubkey()),
            &[&owner],
            env.context.last_blockhash,
        )
    ).await.unwrap();
    
    // Verify upgrade
    let upgraded_agent: Agent = env.get_account(agent_pda).await.unwrap();
    assert_eq!(upgraded_agent.tier, AgentTier::Pro);
}