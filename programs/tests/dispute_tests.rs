use anchor_lang::prelude::*;
use solana_sdk::{signature::Keypair, signer::Signer, system_instruction};
use crate::state::*;
use crate::instructions::*;
use crate::tests::helpers::{TestEnvironment, assertions, constants};

#[tokio::test]
async fn test_dispute_file_success() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let agent_owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &agent_owner] {
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
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();
    let amount = 8_000_000_000; // 8 SOL
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // Deposit to escrow
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

    // File dispute
    let dispute_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (dispute_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"dispute", dispute_id.as_ref()],
        &env.program_id,
    );

    let disputed_amount = 5_000_000_000; // 5 SOL
    let file_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FileDisputeParams {
            dispute_id,
            reason: "Agent did not complete work as agreed".to_string(),
            disputed_amount,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[file_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify dispute creation
    let dispute: Dispute = env.get_account(dispute_pda).await.unwrap();
    assertions::assert_dispute_created(&dispute, creator.pubkey(), escrow_pda, disputed_amount);
}

#[tokio::test]
async fn test_dispute_submit_evidence() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let agent_owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &agent_owner] {
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

    // Create agent, escrow, deposit, and file dispute
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();
    let amount = 8_000_000_000;
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // Deposit and file dispute setup
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams { amount }.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    let dispute_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (dispute_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"dispute", dispute_id.as_ref()],
        &env.program_id,
    );

    let file_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FileDisputeParams {
            dispute_id,
            reason: "Work not completed".to_string(),
            disputed_amount: 5_000_000_000,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[file_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Submit evidence from initiator
    let evidence_text = "Screenshots showing incomplete work and communication logs".to_string();
    let evidence_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(creator.pubkey(), true),
        ],
        data: SubmitEvidenceParams {
            evidence_uri: "https://evidence.example.com/dispute1".to_string(),
            evidence_text,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[evidence_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Submit counter evidence from respondent
    let counter_evidence = "Proof of work completion with timestamps".to_string();
    let counter_evidence_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_owner.pubkey(), true),
        ],
        data: SubmitEvidenceParams {
            evidence_uri: "https://counter-evidence.example.com/agent1".to_string(),
            evidence_text: counter_evidence,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[counter_evidence_ix],
            Some(&agent_owner.pubkey()),
            &[&agent_owner],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify evidence was submitted
    let dispute: Dispute = env.get_account(dispute_pda).await.unwrap();
    assert_eq!(dispute.evidence.len(), 2);
    assert_eq!(dispute.evidence[0].submitter, creator.pubkey());
    assert_eq!(dispute.evidence[1].submitter, agent_owner.pubkey());
}

#[tokio::test]
async fn test_dispute_resolve_in_favor_of_initiator() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let agent_owner = Keypair::new();
    let arbitrator = env.platform_signer.pubkey();

    // Fund accounts
    for account in &[&creator, &agent_owner] {
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

    // Setup: create agent, escrow, dispute
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();
    let amount = 8_000_000_000;
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // Deposit to escrow
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams { amount }.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // File dispute
    let dispute_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (dispute_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"dispute", dispute_id.as_ref()],
        &env.program_id,
    );

    let file_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FileDisputeParams {
            dispute_id,
            reason: "Work not completed as specified".to_string(),
            disputed_amount: 6_000_000_000, // 6 SOL
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[file_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Resolve dispute in favor of initiator
    let resolve_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(arbitrator, true),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), false), // Refund recipient
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: ResolveDisputeParams {
            resolution: DisputeResolution::InFavorOfInitiator,
            refund_amount: 6_000_000_000,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[resolve_ix],
            Some(&arbitrator),
            &[&env.platform_signer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify resolution
    let dispute: Dispute = env.get_account(dispute_pda).await.unwrap();
    assert_eq!(dispute.status, DisputeStatus::ResolvedInFavorOfInitiator);
}

#[tokio::test]
async fn test_dispute_resolve_in_favor_of_respondent() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let agent_owner = Keypair::new();
    let arbitrator = env.platform_signer.pubkey();

    // Fund accounts
    for account in &[&creator, &agent_owner] {
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

    // Setup: create agent, escrow, dispute  
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();
    let amount = 8_000_000_000;
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // Deposit and file dispute
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams { amount }.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    let dispute_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (dispute_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"dispute", dispute_id.as_ref()],
        &env.program_id,
    );

    let file_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FileDisputeParams {
            dispute_id,
            reason: "Frivolous dispute - work was completed".to_string(),
            disputed_amount: 4_000_000_000,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[file_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Resolve dispute in favor of respondent
    let resolve_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(arbitrator, true),
            solana_sdk::instruction::AccountMeta::new(agent_owner.pubkey(), false), // Payment recipient
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: ResolveDisputeParams {
            resolution: DisputeResolution::InFavorOfRespondent,
            refund_amount: 0, // No refund, full payment to agent
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[resolve_ix],
            Some(&arbitrator),
            &[&env.platform_signer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify resolution
    let dispute: Dispute = env.get_account(dispute_pda).await.unwrap();
    assert_eq!(dispute.status, DisputeStatus::ResolvedInFavorOfRespondent);
}

#[tokio::test]
async fn test_dispute_escalate() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let agent_owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &agent_owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    15_000_000_000, // More funds for escalation fee
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Setup: create agent, escrow, deposit, and file dispute
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();
    let amount = 10_000_000_000;
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams { amount }.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    let dispute_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (dispute_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"dispute", dispute_id.as_ref()],
        &env.program_id,
    );

    let file_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FileDisputeParams {
            dispute_id,
            reason: "Complex dispute requiring escalation".to_string(),
            disputed_amount: 7_000_000_000,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[file_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Escalate dispute
    let escalate_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(env.treasury, false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: EscalateDisputeParams {
            escalation_reason: "Initial arbitration was insufficient".to_string(),
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[escalate_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify escalation
    let dispute: Dispute = env.get_account(dispute_pda).await.unwrap();
    assert_eq!(dispute.status, DisputeStatus::Escalated);
    assert!(dispute.escalation_fee_paid);
}

#[tokio::test]
async fn test_dispute_unauthorized_resolution_fails() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let agent_owner = Keypair::new();
    let unauthorized = Keypair::new();

    // Fund accounts
    for account in &[&creator, &agent_owner, &unauthorized] {
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

    // Setup dispute
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();
    let amount = 8_000_000_000;
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams { amount }.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    let dispute_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (dispute_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"dispute", dispute_id.as_ref()],
        &env.program_id,
    );

    let file_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FileDisputeParams {
            dispute_id,
            reason: "Test dispute".to_string(),
            disputed_amount: 4_000_000_000,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[file_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Try to resolve with unauthorized signer
    let resolve_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(unauthorized.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: ResolveDisputeParams {
            resolution: DisputeResolution::InFavorOfInitiator,
            refund_amount: 4_000_000_000,
        }
        .try_to_vec()
        .unwrap(),
    };

    let result = env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[resolve_ix],
            Some(&unauthorized.pubkey()),
            &[&unauthorized],
            env.context.last_blockhash,
        )
    ).await;

    assert!(result.is_err(), "Should fail when unauthorized user tries to resolve");
}

#[tokio::test]
async fn test_dispute_complete_lifecycle() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let agent_owner = Keypair::new();
    let arbitrator = env.platform_signer.pubkey();

    // Fund accounts with extra for fees
    for account in &[&creator, &agent_owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    20_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // 1. Setup: Create agent and escrow
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();
    let amount = 15_000_000_000; // 15 SOL
    let escrow_pda = env.create_escrow(&creator, agent_pda, amount).await.unwrap();

    // 2. Deposit to escrow
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams { amount }.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 3. File dispute
    let dispute_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (dispute_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"dispute", dispute_id.as_ref()],
        &env.program_id,
    );

    let disputed_amount = 10_000_000_000; // 10 SOL
    let file_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FileDisputeParams {
            dispute_id,
            reason: "Work quality does not meet specifications".to_string(),
            disputed_amount,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[file_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 4. Submit evidence from both parties
    let evidence1_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(creator.pubkey(), true),
        ],
        data: SubmitEvidenceParams {
            evidence_uri: "https://evidence.example.com/initiator".to_string(),
            evidence_text: "Quality screenshots and specification comparison".to_string(),
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[evidence1_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    let evidence2_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_owner.pubkey(), true),
        ],
        data: SubmitEvidenceParams {
            evidence_uri: "https://evidence.example.com/respondent".to_string(),
            evidence_text: "Code repository and client communication logs".to_string(),
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[evidence2_ix],
            Some(&agent_owner.pubkey()),
            &[&agent_owner],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 5. Escalate dispute
    let escalate_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(env.treasury, false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: EscalateDisputeParams {
            escalation_reason: "Need senior arbitrator review".to_string(),
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[escalate_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 6. Final resolution - partial refund
    let partial_refund = 6_000_000_000; // 6 SOL refund, 4 SOL to agent
    let resolve_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(arbitrator, true),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: ResolveDisputeParams {
            resolution: DisputeResolution::PartialRefund,
            refund_amount: partial_refund,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[resolve_ix],
            Some(&arbitrator),
            &[&env.platform_signer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify complete lifecycle
    let final_dispute: Dispute = env.get_account(dispute_pda).await.unwrap();
    assert_eq!(final_dispute.status, DisputeStatus::ResolvedPartialRefund);
    assert_eq!(final_dispute.evidence.len(), 2);
    assert!(final_dispute.escalation_fee_paid);
    assert_eq!(final_dispute.resolution_amount, partial_refund);
}