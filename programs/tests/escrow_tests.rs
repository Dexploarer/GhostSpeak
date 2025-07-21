use anchor_lang::prelude::*;
use solana_sdk::{signature::Keypair, signer::Signer, system_instruction};
use crate::state::*;
use crate::instructions::*;
use crate::tests::helpers::{TestEnvironment, assertions, constants};

#[tokio::test]
async fn test_escrow_create_success() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    10_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Create agent first
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();

    // Create escrow
    let amount = 5_000_000_000; // 5 SOL
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // Verify escrow creation
    let escrow: Escrow = env.get_account(escrow_pda).await.unwrap();
    assertions::assert_escrow_created(&escrow, creator.pubkey(), agent_pda, amount);
}

#[tokio::test]
async fn test_escrow_deposit() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    10_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Create agent and escrow
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    let amount = 5_000_000_000;
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // Deposit into escrow
    let deposit_amount = 3_000_000_000; // 3 SOL
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams {
            amount: deposit_amount,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify deposit
    let escrow: Escrow = env.get_account(escrow_pda).await.unwrap();
    assert_eq!(escrow.deposited_amount, deposit_amount);
}

#[tokio::test]
async fn test_escrow_release_success() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    10_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Create agent, escrow, and deposit
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    let amount = 5_000_000_000;
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // Deposit full amount
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams { amount }
            .try_to_vec()
            .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Release escrow funds
    let release_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(owner.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: ReleaseEscrowParams {}.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[release_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify release
    let escrow: Escrow = env.get_account(escrow_pda).await.unwrap();
    assert_eq!(escrow.status, EscrowStatus::Completed);
}

#[tokio::test]
async fn test_escrow_release_unauthorized_fails() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let owner = Keypair::new();
    let attacker = Keypair::new();

    // Fund accounts
    for account in &[&creator, &owner, &attacker] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    10_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Create agent, escrow, and deposit
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    let amount = 5_000_000_000;
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // Deposit full amount
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams { amount }
            .try_to_vec()
            .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Try to release with unauthorized signer
    let release_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(attacker.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(owner.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: ReleaseEscrowParams {}.try_to_vec().unwrap(),
    };

    let result = env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[release_ix],
            Some(&attacker.pubkey()),
            &[&attacker],
            env.context.last_blockhash,
        )
    ).await;

    assert!(result.is_err(), "Should fail when unauthorized user tries to release");
}

#[tokio::test]
async fn test_escrow_refund() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    10_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Create agent, escrow, and deposit
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    let amount = 5_000_000_000;
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // Deposit partial amount
    let deposit_amount = 3_000_000_000;
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams {
            amount: deposit_amount,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Cancel and refund escrow
    let refund_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: RefundEscrowParams {}.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[refund_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify refund
    let escrow: Escrow = env.get_account(escrow_pda).await.unwrap();
    assert_eq!(escrow.status, EscrowStatus::Cancelled);
}

#[tokio::test]
async fn test_escrow_expiry_handling() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    10_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Create agent and escrow with short expiry
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    
    let escrow_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (escrow_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"escrow", escrow_id.as_ref()],
        &env.program_id,
    );

    let ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateEscrowParams {
            escrow_id,
            amount: 5_000_000_000,
            terms: "Test escrow terms".to_string(),
            expiry_timestamp: Clock::get().unwrap().unix_timestamp + 1, // Expires in 1 second
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Advance time past expiry
    env.advance_slots(100).await.unwrap();

    // Try to deposit after expiry - should fail
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams {
            amount: 1_000_000_000,
        }
        .try_to_vec()
        .unwrap(),
    };

    let result = env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await;

    assert!(result.is_err(), "Should fail to deposit after expiry");
}

#[tokio::test]
async fn test_escrow_partial_release() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    10_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Create agent, escrow, and deposit
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&owner, service_types).await.unwrap();
    let amount = 10_000_000_000; // 10 SOL
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // Deposit full amount
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams { amount }
            .try_to_vec()
            .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Partial release - 60% to agent, 40% remains
    let partial_amount = 6_000_000_000; // 6 SOL
    let partial_release_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(owner.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PartialReleaseEscrowParams {
            amount: partial_amount,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[partial_release_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify partial release
    let escrow: Escrow = env.get_account(escrow_pda).await.unwrap();
    assert_eq!(escrow.status, EscrowStatus::PartiallyCompleted);
    assert_eq!(escrow.released_amount, partial_amount);
}

#[tokio::test]
async fn test_escrow_with_milestones() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    10_000_000_000,
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

    // Create escrow with milestones
    let escrow_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (escrow_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"escrow", escrow_id.as_ref()],
        &env.program_id,
    );

    let milestones = vec![
        Milestone {
            id: 1,
            description: "Design phase".to_string(),
            amount: 3_000_000_000, // 3 SOL
            is_completed: false,
        },
        Milestone {
            id: 2,
            description: "Implementation phase".to_string(),
            amount: 5_000_000_000, // 5 SOL
            is_completed: false,
        },
        Milestone {
            id: 3,
            description: "Testing phase".to_string(),
            amount: 2_000_000_000, // 2 SOL
            is_completed: false,
        },
    ];

    let create_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateEscrowWithMilestonesParams {
            escrow_id,
            terms: "Test escrow with milestones".to_string(),
            milestones: milestones.clone(),
            expiry_timestamp: Clock::get().unwrap().unix_timestamp + 86400, // 24 hours
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Complete first milestone
    let complete_milestone_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(owner.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CompleteMilestoneParams { milestone_id: 1 }
            .try_to_vec()
            .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[complete_milestone_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify milestone completion
    let escrow: Escrow = env.get_account(escrow_pda).await.unwrap();
    assert_eq!(escrow.milestones[0].is_completed, true);
    assert_eq!(escrow.released_amount, 3_000_000_000);
}