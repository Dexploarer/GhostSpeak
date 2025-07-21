use anchor_lang::prelude::*;
use solana_sdk::{signature::Keypair, signer::Signer, system_instruction};
use crate::state::*;
use crate::instructions::*;
use crate::tests::helpers::{TestEnvironment, constants};

#[tokio::test]
async fn test_full_agent_service_workflow() {
    let mut env = TestEnvironment::new().await;
    let client = Keypair::new();
    let agent_owner = Keypair::new();

    // Fund accounts
    for account in &[&client, &agent_owner] {
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

    // 1. Agent creates profile
    let service_types = vec!["web_development".to_string(), "blockchain".to_string()];
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();

    // 2. Platform verifies agent
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

    // 3. Client creates service request (auction)
    let auction_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (auction_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"auction", auction_id.as_ref()],
        &env.program_id,
    );

    let create_auction_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(client.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateAuctionParams {
            auction_id,
            service_type: "web_development".to_string(),
            description: "Build a DeFi dashboard with React and Web3".to_string(),
            min_bid_amount: 8_000_000_000, // 8 SOL
            duration: 3600, // 1 hour
            requirements: vec!["React experience".to_string(), "Web3 knowledge".to_string()],
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[create_auction_ix],
            Some(&client.pubkey()),
            &[&client],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 4. Agent bids on auction
    let bid_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new(agent_owner.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PlaceBidParams {
            bid_amount: 12_000_000_000, // 12 SOL
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[bid_ix],
            Some(&agent_owner.pubkey()),
            &[&agent_owner],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 5. Wait for auction to end and finalize
    env.advance_slots(500).await.unwrap();

    let finalize_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(client.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new(agent_owner.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new(env.treasury, false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FinalizeAuctionParams {}.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[finalize_ix],
            Some(&client.pubkey()),
            &[&client],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 6. Create escrow for the work
    let escrow_amount = 12_000_000_000; // 12 SOL (winning bid)
    let escrow_pda = env.create_escrow(&client, agent_pda, escrow_amount).await.unwrap();

    // 7. Client deposits to escrow
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(client.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams {
            amount: escrow_amount,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&client.pubkey()),
            &[&client],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 8. Agent completes work, client releases payment
    let release_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(client.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(agent_owner.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: ReleaseEscrowParams {}.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[release_ix],
            Some(&client.pubkey()),
            &[&client],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify final state
    let final_auction: Auction = env.get_account(auction_pda).await.unwrap();
    let final_escrow: Escrow = env.get_account(escrow_pda).await.unwrap();
    let final_agent: Agent = env.get_account(agent_pda).await.unwrap();

    assert_eq!(final_auction.status, AuctionStatus::Finalized);
    assert_eq!(final_auction.winner, Some(agent_pda));
    assert_eq!(final_escrow.status, EscrowStatus::Completed);
    assert_eq!(final_agent.total_transactions, 1);
    assert!(final_agent.is_verified);
}

#[tokio::test]
async fn test_dispute_resolution_workflow() {
    let mut env = TestEnvironment::new().await;
    let client = Keypair::new();
    let agent_owner = Keypair::new();
    let arbitrator = env.platform_signer.pubkey();

    // Fund accounts
    for account in &[&client, &agent_owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    25_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // 1. Setup: Create agent and escrow
    let service_types = vec!["design".to_string()];
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();
    let escrow_amount = 15_000_000_000; // 15 SOL
    let escrow_pda = env.create_escrow(&client, agent_pda, escrow_amount).await.unwrap();

    // 2. Deposit to escrow
    let deposit_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(client.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: DepositToEscrowParams {
            amount: escrow_amount,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[deposit_ix],
            Some(&client.pubkey()),
            &[&client],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 3. Client files dispute
    let dispute_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (dispute_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"dispute", dispute_id.as_ref()],
        &env.program_id,
    );

    let disputed_amount = 10_000_000_000; // 10 SOL
    let file_dispute_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new(client.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FileDisputeParams {
            dispute_id,
            reason: "Design deliverables do not match agreed specifications".to_string(),
            disputed_amount,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[file_dispute_ix],
            Some(&client.pubkey()),
            &[&client],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 4. Both parties submit evidence
    let client_evidence_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(client.pubkey(), true),
        ],
        data: SubmitEvidenceParams {
            evidence_uri: "https://evidence.client.com/design-specs".to_string(),
            evidence_text: "Original specification document vs delivered designs".to_string(),
        }
        .try_to_vec()
        .unwrap(),
    };

    let agent_evidence_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_owner.pubkey(), true),
        ],
        data: SubmitEvidenceParams {
            evidence_uri: "https://evidence.agent.com/design-process".to_string(),
            evidence_text: "Design process documentation and client communication".to_string(),
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[client_evidence_ix],
            Some(&client.pubkey()),
            &[&client],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[agent_evidence_ix],
            Some(&agent_owner.pubkey()),
            &[&agent_owner],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 5. Client escalates dispute
    let escalate_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new(client.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(env.treasury, false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: EscalateDisputeParams {
            escalation_reason: "Complex design dispute requiring senior review".to_string(),
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[escalate_ix],
            Some(&client.pubkey()),
            &[&client],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 6. Arbitrator resolves with partial refund
    let partial_refund = 6_000_000_000; // 6 SOL to client, 4 SOL to agent
    let resolve_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(dispute_pda, false),
            solana_sdk::instruction::AccountMeta::new(escrow_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(arbitrator, true),
            solana_sdk::instruction::AccountMeta::new(client.pubkey(), false),
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

    // Verify resolution outcome
    let final_dispute: Dispute = env.get_account(dispute_pda).await.unwrap();
    let final_escrow: Escrow = env.get_account(escrow_pda).await.unwrap();

    assert_eq!(final_dispute.status, DisputeStatus::ResolvedPartialRefund);
    assert_eq!(final_dispute.resolution_amount, partial_refund);
    assert!(final_dispute.escalation_fee_paid);
    assert_eq!(final_dispute.evidence.len(), 2);
    assert_eq!(final_escrow.status, EscrowStatus::DisputeResolved);
}

#[tokio::test]
async fn test_multi_agent_auction_competition() {
    let mut env = TestEnvironment::new().await;
    let client = Keypair::new();
    let agent1_owner = Keypair::new();
    let agent2_owner = Keypair::new();
    let agent3_owner = Keypair::new();

    // Fund all accounts
    for account in &[&client, &agent1_owner, &agent2_owner, &agent3_owner] {
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

    // 1. Create three competing agents
    let service_types = vec!["ai_development".to_string()];
    let agent1_pda = env.create_test_agent(&agent1_owner, service_types.clone()).await.unwrap();
    let agent2_pda = env.create_test_agent(&agent2_owner, service_types.clone()).await.unwrap();
    let agent3_pda = env.create_test_agent(&agent3_owner, service_types).await.unwrap();

    // 2. Create competitive auction
    let auction_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (auction_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"auction", auction_id.as_ref()],
        &env.program_id,
    );

    let create_auction_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(client.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateAuctionParams {
            auction_id,
            service_type: "ai_development".to_string(),
            description: "Develop AI chatbot with custom training".to_string(),
            min_bid_amount: 20_000_000_000, // 20 SOL minimum
            duration: 1800, // 30 minutes
            requirements: vec![
                "Python/TensorFlow experience".to_string(),
                "NLP expertise".to_string(),
                "Previous AI projects".to_string(),
            ],
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[create_auction_ix],
            Some(&client.pubkey()),
            &[&client],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 3. Agents place competitive bids
    
    // Agent 1 bids 22 SOL
    let bid1_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent1_pda, false),
            solana_sdk::instruction::AccountMeta::new(agent1_owner.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PlaceBidParams {
            bid_amount: 22_000_000_000, // 22 SOL
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[bid1_ix],
            Some(&agent1_owner.pubkey()),
            &[&agent1_owner],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Agent 2 outbids with 25 SOL
    let bid2_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent2_pda, false),
            solana_sdk::instruction::AccountMeta::new(agent2_owner.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(agent1_owner.pubkey(), false), // Previous bidder
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PlaceBidParams {
            bid_amount: 25_000_000_000, // 25 SOL
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[bid2_ix],
            Some(&agent2_owner.pubkey()),
            &[&agent2_owner],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Agent 3 places final winning bid of 30 SOL
    let bid3_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent3_pda, false),
            solana_sdk::instruction::AccountMeta::new(agent3_owner.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(agent2_owner.pubkey(), false), // Previous bidder
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PlaceBidParams {
            bid_amount: 30_000_000_000, // 30 SOL
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[bid3_ix],
            Some(&agent3_owner.pubkey()),
            &[&agent3_owner],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 4. Wait for auction to end
    env.advance_slots(1000).await.unwrap();

    // 5. Finalize auction
    let finalize_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(client.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new(agent3_owner.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new(env.treasury, false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FinalizeAuctionParams {}.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[finalize_ix],
            Some(&client.pubkey()),
            &[&client],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify auction results
    let final_auction: Auction = env.get_account(auction_pda).await.unwrap();
    assert_eq!(final_auction.status, AuctionStatus::Finalized);
    assert_eq!(final_auction.highest_bid, 30_000_000_000);
    assert_eq!(final_auction.highest_bidder, agent3_pda);
    assert_eq!(final_auction.winner, Some(agent3_pda));
    
    // Verify all agents exist and have correct stats
    let agent1: Agent = env.get_account(agent1_pda).await.unwrap();
    let agent2: Agent = env.get_account(agent2_pda).await.unwrap();
    let agent3: Agent = env.get_account(agent3_pda).await.unwrap();
    
    assert!(agent1.is_active);
    assert!(agent2.is_active);
    assert!(agent3.is_active);
    
    // Agent 3 should be recorded as winner in auction
    assert_eq!(final_auction.winner, Some(agent3_pda));
}