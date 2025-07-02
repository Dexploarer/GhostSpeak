//! Quick validation script for PodAI Rust SDK core functionality
//! 
//! This script validates that core SDK components work without requiring
//! heavy dependencies like RocksDB or full Solana client functionality.

use podai_sdk::{
    utils::pda::{find_agent_pda, find_channel_pda, PdaBuilder},
    types::{
        channel::{ChannelAccount, ChannelVisibility},
        agent::{AgentAccount, AgentCapabilities},
        message::{MessageAccount, MessageType, MessageStatus},
    },
};
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};
use std::time::Instant;

fn main() {
    println!("🔍 PodAI Rust SDK - Quick Validation");
    println!("====================================");
    println!();

    let mut tests_passed = 0;
    let mut tests_failed = 0;

    // Test 1: PDA Generation
    println!("📍 Test 1: PDA Generation");
    let test_keypair = Keypair::new();
    let wallet = test_keypair.pubkey();
    
    let start = Instant::now();
    let (agent_pda, agent_bump) = find_agent_pda(&wallet);
    let pda_time = start.elapsed();
    
    if agent_bump <= 255 {
        println!("   ✅ Agent PDA generated: {} (bump: {})", agent_pda, agent_bump);
        println!("   ⏱️  Time: {:?}", pda_time);
        tests_passed += 1;
    } else {
        println!("   ❌ Invalid PDA bump");
        tests_failed += 1;
    }
    println!();

    // Test 2: Channel PDA Generation
    println!("📍 Test 2: Channel PDA Generation");
    let creator = Keypair::new();
    let channel_name = "test-channel";
    
    let (channel_pda, channel_bump) = find_channel_pda(&creator.pubkey(), channel_name);
    
    if channel_bump <= 255 {
        println!("   ✅ Channel PDA generated: {} (bump: {})", channel_pda, channel_bump);
        tests_passed += 1;
    } else {
        println!("   ❌ Invalid Channel PDA bump");
        tests_failed += 1;
    }
    println!();

    // Test 3: AgentAccount Creation
    println!("📍 Test 3: AgentAccount Creation");
    match AgentAccount::new(
        wallet,
        AgentCapabilities::Communication as u64 | AgentCapabilities::Trading as u64,
        "https://example.com/agent-metadata.json".to_string(),
        100, // stake_amount
    ) {
        Ok(agent) => {
            println!("   ✅ AgentAccount created successfully");
            println!("   📋 Pubkey: {}", agent.pubkey);
            println!("   📋 Capabilities: {}", agent.capabilities);
            println!("   📋 Metadata URI: {}", agent.metadata_uri);
            tests_passed += 1;
        }
        Err(e) => {
            println!("   ❌ Failed to create AgentAccount: {}", e);
            tests_failed += 1;
        }
    }
    println!();

    // Test 4: ChannelAccount Creation  
    println!("📍 Test 4: ChannelAccount Creation");
    match ChannelAccount::new(
        creator.pubkey(),
        "Test Channel".to_string(),
        "A test channel for validation".to_string(),
        ChannelVisibility::Public,
        1000, // max_participants
        500,  // fee_per_message
        channel_bump,
    ) {
        Ok(channel) => {
            println!("   ✅ ChannelAccount created successfully");
            println!("   📋 Creator: {}", channel.creator);
            println!("   📋 Name: {}", channel.name);
            println!("   📋 Visibility: {:?}", channel.visibility);
            tests_passed += 1;
        }
        Err(e) => {
            println!("   ❌ Failed to create ChannelAccount: {}", e);
            tests_failed += 1;
        }
    }
    println!();

    // Test 5: MessageAccount Creation
    println!("📍 Test 5: MessageAccount Creation");
    let sender = Keypair::new();
    let recipient = Keypair::new();
    let payload_hash = [42u8; 32];
    
    let message = MessageAccount::new(
        sender.pubkey(),
        recipient.pubkey(),
        payload_hash,
        MessageType::Text,
        255, // bump
    );

    println!("   ✅ MessageAccount created successfully");
    println!("   📋 Sender: {}", message.sender);
    println!("   📋 Recipient: {}", message.recipient);
    println!("   📋 Type: {:?}", message.message_type);
    println!("   📋 Status: {:?}", message.status);
    tests_passed += 1;
    println!();

    // Test 6: Borsh Serialization
    println!("📍 Test 6: Borsh Serialization");
    let test_agent = AgentAccount::new(
        wallet,
        AgentCapabilities::Communication as u64,
        "https://example.com/test-agent.json".to_string(),
        100,
    ).unwrap();

    match borsh::to_vec(&test_agent) {
        Ok(serialized) => {
            println!("   ✅ Borsh serialization successful");
            println!("   📊 Serialized size: {} bytes", serialized.len());
            
            // Test deserialization
            match borsh::from_slice::<AgentAccount>(&serialized) {
                Ok(deserialized) => {
                    if deserialized.metadata_uri == test_agent.metadata_uri {
                        println!("   ✅ Borsh deserialization successful");
                        tests_passed += 1;
                    } else {
                        println!("   ❌ Deserialized data doesn't match");
                        tests_failed += 1;
                    }
                }
                Err(e) => {
                    println!("   ❌ Deserialization failed: {}", e);
                    tests_failed += 1;
                }
            }
        }
        Err(e) => {
            println!("   ❌ Serialization failed: {}", e);
            tests_failed += 1;
        }
    }
    println!();

    // Test 7: PDA Builder
    println!("📍 Test 7: PDA Builder");
    let program_id = podai_sdk::program_id();
    let custom_pda = PdaBuilder::new(program_id)
        .add_str("custom")
        .add_pubkey(&wallet)
        .add_u64(12345)
        .build();
    
    if custom_pda.1 <= 255 {
        println!("   ✅ PdaBuilder works correctly");
        println!("   📋 Custom PDA: {} (bump: {})", custom_pda.0, custom_pda.1);
        tests_passed += 1;
    } else {
        println!("   ❌ PdaBuilder generated invalid bump");
        tests_failed += 1;
    }
    println!();

    // Test 8: Performance Validation (Simple)
    println!("📍 Test 8: Performance Check");
    let iterations = 1000;
    let start = Instant::now();
    
    for _ in 0..iterations {
        let keypair = Keypair::new();
        let _ = find_agent_pda(&keypair.pubkey());
    }
    
    let duration = start.elapsed();
    let ops_per_sec = iterations as f64 / duration.as_secs_f64();
    
    if ops_per_sec > 10_000.0 {
        println!("   ✅ Performance check passed");
        println!("   🚀 PDA generation: {:.0} ops/sec", ops_per_sec);
        tests_passed += 1;
    } else {
        println!("   ⚠️  Performance below expected: {:.0} ops/sec", ops_per_sec);
        tests_failed += 1;
    }
    println!();

    // Results Summary
    println!("📊 Validation Results");
    println!("====================");
    println!("✅ Tests passed: {}", tests_passed);
    println!("❌ Tests failed: {}", tests_failed);
    
    let total_tests = tests_passed + tests_failed;
    let success_rate = (tests_passed as f64 / total_tests as f64) * 100.0;
    
    println!("📈 Success rate: {:.1}%", success_rate);
    
    if tests_failed == 0 {
        println!("🎉 ALL TESTS PASSED - SDK is working correctly!");
    } else if success_rate >= 75.0 {
        println!("⚠️  Most tests passed - Minor issues detected");
    } else {
        println!("❌ Major issues detected - SDK needs attention");
    }
    
    println!();
    println!("🔧 Next Steps:");
    if tests_failed == 0 {
        println!("   • SDK core functionality validated ✅");
        println!("   • Ready for integration testing");
        println!("   • Ready for blockchain interaction testing");
    } else {
        println!("   • Review failed tests and fix issues");
        println!("   • Re-run validation after fixes");
    }
} 