#!/usr/bin/env bun

/**
 * Demo script to showcase the enhanced CLI commands
 * Run with: bun run examples/demo-enhanced-commands.ts
 */

import chalk from 'chalk';
import { depositEscrow, checkEscrowStatus, releaseEscrow } from '../src/commands/escrow.js';
import { sendMessage, listMessages } from '../src/commands/message.js';
import { manageConfidentialTransfer, showTransferHistory } from '../src/commands/confidential-transfer.js';
import { showMevStatus, enableMevProtection, showMevSavings } from '../src/commands/mev-protection.js';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demoEscrowCommands() {
  console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('🔐 ESCROW DEPOSIT DEMO'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  
  // Demo escrow deposit
  await depositEscrow('marketplace-channel-1', 2.5);
  await delay(1000);
  
  // Check escrow status
  console.log(chalk.yellow('\n📊 Checking escrow status...\n'));
  await checkEscrowStatus('marketplace-channel-1');
  await delay(1000);
  
  // Release some funds
  console.log(chalk.yellow('\n💸 Releasing escrow funds...\n'));
  await releaseEscrow('marketplace-channel-1', 1.0);
}

async function demoMessageCommands() {
  console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('💬 MESSAGE SEND/LIST DEMO'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  
  // Send a regular message
  await sendMessage('general-chat', 'Hello everyone! Testing the new messaging system.', {});
  await delay(1000);
  
  // Send an encrypted message
  console.log(chalk.yellow('\n🔐 Sending encrypted message...\n'));
  await sendMessage('general-chat', 'This is a confidential message about the trade deal.', {
    encrypted: true,
    contentType: 'text'
  });
  await delay(1000);
  
  // List messages
  console.log(chalk.yellow('\n📜 Listing channel messages...\n'));
  await listMessages('general-chat', { pageSize: 10 });
}

async function demoConfidentialTransfer() {
  console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('🔒 CONFIDENTIAL TRANSFER DEMO'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  
  // Show transfer options
  await manageConfidentialTransfer({});
  await delay(2000);
  
  // Execute a confidential transfer
  console.log(chalk.yellow('\n🚀 Executing confidential transfer...\n'));
  await manageConfidentialTransfer({
    amount: '1.5',
    recipient: 'DemoWallet1234567890abcdefghijklmnopqrstuvw',
    confidential: true
  });
  await delay(1000);
  
  // Show transfer history
  console.log(chalk.yellow('\n📊 Transfer history...\n'));
  await showTransferHistory(true);
}

async function demoMevProtection() {
  console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('🛡️ MEV PROTECTION DEMO'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  
  // Show current MEV status
  await showMevStatus();
  await delay(2000);
  
  // Enable MEV protection for an agent
  console.log(chalk.yellow('\n🚀 Enabling MEV protection for agent...\n'));
  await enableMevProtection('agent-demo-001');
  await delay(1000);
  
  // Show MEV savings
  console.log(chalk.yellow('\n💰 MEV protection savings report...\n'));
  await showMevSavings();
}

async function main() {
  console.log(chalk.magenta.bold('\n🚀 GhostSpeak Enhanced CLI Commands Demo\n'));
  console.log(chalk.gray('This demo showcases the enhanced functionality of key CLI commands'));
  console.log(chalk.gray('All operations run in simulation mode when blockchain is not available\n'));
  
  try {
    // Demo each command category
    await demoEscrowCommands();
    await delay(2000);
    
    await demoMessageCommands();
    await delay(2000);
    
    await demoConfidentialTransfer();
    await delay(2000);
    
    await demoMevProtection();
    
    console.log(chalk.green.bold('\n✅ Demo completed successfully!\n'));
    console.log(chalk.yellow('💡 Tips:'));
    console.log(chalk.gray('• These commands work with or without blockchain connection'));
    console.log(chalk.gray('• In simulation mode, data is stored in memory'));
    console.log(chalk.gray('• With SDK available, commands interact with real blockchain'));
    console.log(chalk.gray('• Use --verbose flag for detailed output'));
    console.log(chalk.gray('• Check ghostspeak --help for all available commands\n'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Demo failed:'), error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);