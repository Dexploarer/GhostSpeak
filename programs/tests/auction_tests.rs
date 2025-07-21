use anchor_lang::prelude::*;
use solana_sdk::{signature::Keypair, signer::Signer, system_instruction};
use crate::state::*;
use crate::instructions::*;
use crate::tests::helpers::{TestEnvironment, assertions, constants};

#[tokio::test]
async fn test_auction_create_success() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();

    // Fund the creator account
    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[system_instruction::transfer(
                &env.context.payer.pubkey(),
                &creator.pubkey(),
                10_000_000_000,
            )],
            Some(&env.context.payer.pubkey()),
            &[&env.context.payer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Create auction
    let auction_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (auction_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"auction", auction_id.as_ref()],
        &env.program_id,
    );

    let service_type = "coding".to_string();
    let min_bid = 5_000_000_000; // 5 SOL

    let ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateAuctionParams {
            auction_id,
            service_type: service_type.clone(),
            description: "Test auction for coding services".to_string(),
            min_bid_amount: min_bid,
            duration: 3600, // 1 hour
            requirements: vec!["Must have Python experience".to_string()],
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

    // Verify auction creation
    let auction: Auction = env.get_account(auction_pda).await.unwrap();
    assertions::assert_auction_created(&auction, creator.pubkey(), min_bid, &service_type);
}

#[tokio::test]
async fn test_auction_bid_success() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let bidder = Keypair::new();
    let agent_owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &bidder, &agent_owner] {
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
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();

    // Create auction
    let auction_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (auction_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"auction", auction_id.as_ref()],
        &env.program_id,
    );

    let create_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateAuctionParams {
            auction_id,
            service_type: "coding".to_string(),
            description: "Test auction for coding services".to_string(),
            min_bid_amount: 5_000_000_000,
            duration: 3600,
            requirements: vec![],
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

    // Place bid
    let bid_amount = 7_000_000_000; // 7 SOL
    let bid_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new(bidder.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PlaceBidParams {
            bid_amount,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[bid_ix],
            Some(&bidder.pubkey()),
            &[&bidder],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify bid
    let auction: Auction = env.get_account(auction_pda).await.unwrap();
    assert_eq!(auction.highest_bid, bid_amount);
    assert_eq!(auction.highest_bidder, agent_pda);
}

#[tokio::test]
async fn test_auction_bid_too_low_fails() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let bidder = Keypair::new();
    let agent_owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &bidder, &agent_owner] {
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

    // Create agent and auction
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();
    
    let auction_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (auction_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"auction", auction_id.as_ref()],
        &env.program_id,
    );

    let min_bid = 5_000_000_000; // 5 SOL
    let create_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateAuctionParams {
            auction_id,
            service_type: "coding".to_string(),
            description: "Test auction".to_string(),
            min_bid_amount: min_bid,
            duration: 3600,
            requirements: vec![],
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

    // Try to place bid below minimum
    let low_bid = 3_000_000_000; // 3 SOL (below 5 SOL minimum)
    let bid_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new(bidder.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PlaceBidParams {
            bid_amount: low_bid,
        }
        .try_to_vec()
        .unwrap(),
    };

    let result = env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[bid_ix],
            Some(&bidder.pubkey()),
            &[&bidder],
            env.context.last_blockhash,
        )
    ).await;

    assert!(result.is_err(), "Should fail when bid is below minimum");
}

#[tokio::test]
async fn test_auction_outbid_scenario() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let bidder1 = Keypair::new();
    let bidder2 = Keypair::new();
    let agent_owner1 = Keypair::new();
    let agent_owner2 = Keypair::new();

    // Fund accounts
    for account in &[&creator, &bidder1, &bidder2, &agent_owner1, &agent_owner2] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    15_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Create agents
    let service_types = vec!["coding".to_string()];
    let agent_pda1 = env.create_test_agent(&agent_owner1, service_types.clone()).await.unwrap();
    let agent_pda2 = env.create_test_agent(&agent_owner2, service_types).await.unwrap();

    // Create auction
    let auction_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (auction_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"auction", auction_id.as_ref()],
        &env.program_id,
    );

    let create_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateAuctionParams {
            auction_id,
            service_type: "coding".to_string(),
            description: "Test auction".to_string(),
            min_bid_amount: 5_000_000_000,
            duration: 3600,
            requirements: vec![],
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

    // First bid
    let first_bid = 7_000_000_000; // 7 SOL
    let bid1_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_pda1, false),
            solana_sdk::instruction::AccountMeta::new(bidder1.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PlaceBidParams {
            bid_amount: first_bid,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[bid1_ix],
            Some(&bidder1.pubkey()),
            &[&bidder1],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Second bid (higher)
    let second_bid = 10_000_000_000; // 10 SOL
    let bid2_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_pda2, false),
            solana_sdk::instruction::AccountMeta::new(bidder2.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(bidder1.pubkey(), false), // Previous bidder for refund
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PlaceBidParams {
            bid_amount: second_bid,
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[bid2_ix],
            Some(&bidder2.pubkey()),
            &[&bidder2],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify outbid
    let auction: Auction = env.get_account(auction_pda).await.unwrap();
    assert_eq!(auction.highest_bid, second_bid);
    assert_eq!(auction.highest_bidder, agent_pda2);
}

#[tokio::test]
async fn test_auction_finalize_success() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let bidder = Keypair::new();
    let agent_owner = Keypair::new();

    // Fund accounts
    for account in &[&creator, &bidder, &agent_owner] {
        env.context.banks_client.process_transaction(
            solana_sdk::transaction::Transaction::new_signed_with_payer(
                &[system_instruction::transfer(
                    &env.context.payer.pubkey(),
                    &account.pubkey(),
                    15_000_000_000,
                )],
                Some(&env.context.payer.pubkey()),
                &[&env.context.payer],
                env.context.last_blockhash,
            )
        ).await.unwrap();
    }

    // Create agent, auction, and place bid
    let service_types = vec!["coding".to_string()];
    let agent_pda = env.create_test_agent(&agent_owner, service_types).await.unwrap();
    
    let auction_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (auction_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"auction", auction_id.as_ref()],
        &env.program_id,
    );

    // Create auction with short duration
    let create_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateAuctionParams {
            auction_id,
            service_type: "coding".to_string(),
            description: "Test auction".to_string(),
            min_bid_amount: 5_000_000_000,
            duration: 60, // 1 minute
            requirements: vec![],
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

    // Place bid
    let bid_amount = 8_000_000_000; // 8 SOL
    let bid_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_pda, false),
            solana_sdk::instruction::AccountMeta::new(bidder.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PlaceBidParams { bid_amount }
            .try_to_vec()
            .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[bid_ix],
            Some(&bidder.pubkey()),
            &[&bidder],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Advance time past auction duration
    env.advance_slots(300).await.unwrap();

    // Finalize auction
    let finalize_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new(agent_owner.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new(env.treasury, false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FinalizeAuctionParams {}.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[finalize_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify finalization
    let auction: Auction = env.get_account(auction_pda).await.unwrap();
    assert_eq!(auction.status, AuctionStatus::Finalized);
}

#[tokio::test]
async fn test_auction_cancel() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();

    // Fund the creator account
    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[system_instruction::transfer(
                &env.context.payer.pubkey(),
                &creator.pubkey(),
                10_000_000_000,
            )],
            Some(&env.context.payer.pubkey()),
            &[&env.context.payer],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Create auction
    let auction_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (auction_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"auction", auction_id.as_ref()],
        &env.program_id,
    );

    let create_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateAuctionParams {
            auction_id,
            service_type: "coding".to_string(),
            description: "Test auction".to_string(),
            min_bid_amount: 5_000_000_000,
            duration: 3600,
            requirements: vec![],
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

    // Cancel auction
    let cancel_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(creator.pubkey(), true),
        ],
        data: CancelAuctionParams {}.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[cancel_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify cancellation
    let auction: Auction = env.get_account(auction_pda).await.unwrap();
    assert_eq!(auction.status, AuctionStatus::Cancelled);
}

#[tokio::test]
async fn test_auction_lifecycle_complete() {
    let mut env = TestEnvironment::new().await;
    let creator = Keypair::new();
    let bidder1 = Keypair::new();
    let bidder2 = Keypair::new();
    let agent_owner1 = Keypair::new();
    let agent_owner2 = Keypair::new();

    // Fund accounts
    for account in &[&creator, &bidder1, &bidder2, &agent_owner1, &agent_owner2] {
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

    // 1. Create agents
    let service_types = vec!["coding".to_string()];
    let agent_pda1 = env.create_test_agent(&agent_owner1, service_types.clone()).await.unwrap();
    let agent_pda2 = env.create_test_agent(&agent_owner2, service_types).await.unwrap();

    // 2. Create auction
    let auction_id = solana_sdk::pubkey::Pubkey::new_unique();
    let (auction_pda, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"auction", auction_id.as_ref()],
        &env.program_id,
    );

    let create_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: CreateAuctionParams {
            auction_id,
            service_type: "coding".to_string(),
            description: "Complete auction test".to_string(),
            min_bid_amount: 5_000_000_000,
            duration: 300, // 5 minutes
            requirements: vec!["Must have React experience".to_string()],
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

    // 3. First bid
    let bid1_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_pda1, false),
            solana_sdk::instruction::AccountMeta::new(bidder1.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: PlaceBidParams {
            bid_amount: 7_000_000_000, // 7 SOL
        }
        .try_to_vec()
        .unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[bid1_ix],
            Some(&bidder1.pubkey()),
            &[&bidder1],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 4. Outbid
    let bid2_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new_readonly(agent_pda2, false),
            solana_sdk::instruction::AccountMeta::new(bidder2.pubkey(), true),
            solana_sdk::instruction::AccountMeta::new(bidder1.pubkey(), false),
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
            &[bid2_ix],
            Some(&bidder2.pubkey()),
            &[&bidder2],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // 5. Wait for auction to end
    env.advance_slots(500).await.unwrap();

    // 6. Finalize auction
    let finalize_ix = solana_sdk::instruction::Instruction {
        program_id: env.program_id,
        accounts: vec![
            solana_sdk::instruction::AccountMeta::new(auction_pda, false),
            solana_sdk::instruction::AccountMeta::new(creator.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new(agent_owner2.pubkey(), false),
            solana_sdk::instruction::AccountMeta::new(env.treasury, false),
            solana_sdk::instruction::AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ],
        data: FinalizeAuctionParams {}.try_to_vec().unwrap(),
    };

    env.context.banks_client.process_transaction(
        solana_sdk::transaction::Transaction::new_signed_with_payer(
            &[finalize_ix],
            Some(&creator.pubkey()),
            &[&creator],
            env.context.last_blockhash,
        )
    ).await.unwrap();

    // Verify complete lifecycle
    let final_auction: Auction = env.get_account(auction_pda).await.unwrap();
    assert_eq!(final_auction.status, AuctionStatus::Finalized);
    assert_eq!(final_auction.highest_bid, 12_000_000_000);
    assert_eq!(final_auction.highest_bidder, agent_pda2);
    assert_eq!(final_auction.winner, Some(agent_pda2));
}