/**
 * Escrow Commands - Secure Payment Escrow
 *
 * Manages secure payment escrow for agent transactions.
 */

import chalk from 'chalk';
import { createSolanaRpc } from '@solana/rpc';
import { address } from '@solana/addresses';
import type { Address } from '@solana/addresses';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { ConfigManager } from '../core/ConfigManager.js';
import { Logger } from '../core/Logger.js';
import { logger } from '../utils/logger.js';
import { isVerboseMode } from '../utils/cli-options.js';
import { lamportsToSol, solToLamports, formatDate, truncateAddress } from '../utils/format.js';
import { ProgressIndicator } from '../utils/prompts.js';

// Service instances
let escrowService: any = null;
let rpcClient: any = null;

async function getEscrowService() {
  if (!escrowService) {
    try {
      // Load configuration
      const config = await ConfigManager.load();
      const rpcUrl = (config as any).rpcUrl || 'https://api.devnet.solana.com';
      const programId = address((config as any).programId || '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK');
      
      // Create RPC client
      rpcClient = createSolanaRpc(rpcUrl);
      
      // Load escrow service from SDK dynamically
      const { EscrowService } = await import('../../sdk/src/services/escrow.js');
      escrowService = new EscrowService(rpcClient, programId);
      
      logger.general.debug('Escrow service initialized successfully');
    } catch (error) {
      logger.general.error('Failed to initialize escrow service:', error);
      throw error;
    }
  }
  return escrowService;
}

async function getKeypairFromConfig() {
  const config = await ConfigManager.load();
  
  if (!(config as any).walletPath) {
    throw new Error('No wallet configured. Run "ghostspeak wallet create" first.');
  }
  
  try {
    const walletData = await import((config as any).walletPath);
    return createKeyPairSignerFromBytes(new Uint8Array(walletData.default));
  } catch (error) {
    throw new Error(`Failed to load wallet from ${(config as any).walletPath}. Please check your wallet configuration.`);
  }
}

export async function createEscrow(
  beneficiary: string,
  amount: number,
  description?: string
): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());
  const progress = new ProgressIndicator('Creating escrow...');

  try {
    cliLogger.general.info(chalk.cyan('🔐 Creating Escrow'));
    cliLogger.general.info(chalk.gray('─'.repeat(50)));
    cliLogger.general.info(`Beneficiary: ${chalk.blue(truncateAddress(beneficiary))}`);
    cliLogger.general.info(`Amount: ${chalk.green(amount + ' SOL')}`);
    if (description) {
      cliLogger.general.info(`Description: ${chalk.gray(description)}`);
    }
    cliLogger.general.info('');
    
    progress.start();
    
    // Get signer and service
    const signer = await getKeypairFromConfig();
    const service = await getEscrowService();
    const beneficiaryAddress = address(beneficiary);
    const amountLamports = solToLamports(amount);
    
    // Create work order (which includes escrow)
    const result = await service.createWorkOrder(signer, {
      agentAddress: beneficiaryAddress,
      taskDescription: description || 'Escrow payment',
      paymentAmount: amountLamports,
      deadline: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      requirements: 'Complete the agreed upon work',
      deliverables: 'As specified in the agreement'
    });
    
    progress.stop();
    
    cliLogger.general.info(chalk.green('✅ Escrow created successfully!'));
    cliLogger.general.info('');
    cliLogger.general.info(chalk.gray('Details:'));
    cliLogger.general.info(`  Escrow ID: ${chalk.cyan(result.workOrderPda)}`);
    cliLogger.general.info(`  Transaction: ${chalk.gray(result.signature)}`);
    cliLogger.general.info(`  Amount: ${chalk.green(amount + ' SOL')}`);
    cliLogger.general.info(`  Beneficiary: ${chalk.blue(beneficiary)}`);
    cliLogger.general.info('');
    cliLogger.general.info(chalk.yellow('💡 Next steps:'));
    cliLogger.general.info(chalk.gray('   • Provider completes work and submits delivery'));
    cliLogger.general.info(chalk.gray('   • You review and approve the work'));
    cliLogger.general.info(chalk.gray('   • Funds are released upon approval'));
    
  } catch (error) {
    progress.stop();
    logger.escrow.error(chalk.red('❌ Failed to create escrow:'), error);
    logger.escrow.info('');
    logger.escrow.info(chalk.yellow('💡 Troubleshooting:'));
    logger.escrow.info(chalk.gray('   • Ensure you have sufficient SOL balance'));
    logger.escrow.info(chalk.gray('   • Check the beneficiary address is valid'));
    logger.escrow.info(chalk.gray('   • Verify network connection'));
    throw error;
  }
}

export async function depositEscrow(
  escrowId: string,
  amount: number
): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());
  const progress = new ProgressIndicator('Depositing to escrow...');

  try {
    cliLogger.general.info(chalk.cyan('💰 Depositing to Escrow'));
    cliLogger.general.info(chalk.gray('─'.repeat(50)));
    cliLogger.general.info(`Escrow ID: ${chalk.blue(truncateAddress(escrowId))}`);
    cliLogger.general.info(`Amount: ${chalk.green(amount + ' SOL')}`);
    cliLogger.general.info('');
    
    progress.start();
    
    // Get signer and service
    const signer = await getKeypairFromConfig();
    const service = await getEscrowService();
    const escrowAddress = address(escrowId);
    const amountLamports = solToLamports(amount);
    
    // Deposit additional funds
    const signature = await service.depositFunds(
      signer,
      escrowAddress,
      amountLamports
    );
    
    progress.stop();
    
    cliLogger.general.info(chalk.green('✅ Deposit successful!'));
    cliLogger.general.info('');
    cliLogger.general.info(chalk.gray('Details:'));
    cliLogger.general.info(`  Transaction: ${chalk.cyan(signature)}`);
    cliLogger.general.info(`  Amount deposited: ${chalk.green(amount + ' SOL')}`);
    cliLogger.general.info(`  Escrow ID: ${chalk.blue(escrowId)}`);
    
  } catch (error) {
    progress.stop();
    logger.escrow.error(chalk.red('❌ Failed to deposit to escrow:'), error);
    logger.escrow.info('');
    logger.escrow.info(chalk.yellow('💡 Troubleshooting:'));
    logger.escrow.info(chalk.gray('   • Ensure you have sufficient SOL balance'));
    logger.escrow.info(chalk.gray('   • Check the escrow ID is valid'));
    logger.escrow.info(chalk.gray('   • Verify you have permission to deposit'));
    throw error;
  }
}

export async function releaseEscrow(
  escrowId: string,
  recipient?: string
): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());
  const progress = new ProgressIndicator('Processing escrow release...');

  try {
    cliLogger.general.info(chalk.cyan('🔓 Releasing Escrow'));
    cliLogger.general.info(chalk.gray('─'.repeat(50)));
    cliLogger.general.info(`Escrow ID: ${chalk.blue(truncateAddress(escrowId))}`);
    
    progress.start();
    
    // Get signer and service
    const signer = await getKeypairFromConfig();
    const service = await getEscrowService();
    const escrowAddress = address(escrowId);
    
    // Get escrow details
    const escrowAccount = await service.getEscrow(escrowAddress);
    if (!escrowAccount) {
      throw new Error('Escrow not found');
    }
    
    const recipientAddress = recipient ? address(recipient) : escrowAccount.beneficiary;
    
    cliLogger.general.info(`Amount: ${chalk.green(lamportsToSol(escrowAccount.amount) + ' SOL')}`);
    cliLogger.general.info(`Recipient: ${chalk.blue(truncateAddress(String(recipientAddress)))}`);
    cliLogger.general.info('');
    
    // Check if escrow can be released
    const releaseCheck = await service.canRelease(escrowAddress);
    if (!releaseCheck.canRelease) {
      throw new Error(`Cannot release escrow: ${releaseCheck.reason}`);
    }
    
    // For now, we'll use processPayment to release funds
    // In a full implementation, this would check token accounts
    const signature = await service.processPayment(
      signer,
      escrowAddress, // workOrderPda
      recipientAddress, // providerAgent
      escrowAccount.amount,
      signer.address, // payerTokenAccount - will be derived by SDK
      recipientAddress, // providerTokenAccount - will be derived by SDK
      address('So11111111111111111111111111111111111111112'), // Native SOL mint
      false // useConfidentialTransfer
    );
    
    progress.stop();
    
    cliLogger.general.info(chalk.green('✅ Escrow released successfully!'));
    cliLogger.general.info('');
    cliLogger.general.info(chalk.gray('Details:'));
    cliLogger.general.info(`  Transaction: ${chalk.cyan(signature)}`);
    cliLogger.general.info(`  Amount released: ${chalk.green(lamportsToSol(escrowAccount.amount) + ' SOL')}`);
    cliLogger.general.info(`  Recipient: ${chalk.blue(truncateAddress(String(recipientAddress)))}`);

  } catch (error) {
    progress.stop();
    logger.escrow.error(chalk.red('❌ Failed to release escrow:'), error);
    logger.escrow.info('');
    logger.escrow.info(chalk.yellow('💡 Troubleshooting:'));
    logger.escrow.info(chalk.gray('   • Ensure you are authorized to release this escrow'));
    logger.escrow.info(chalk.gray('   • Check if release conditions are met'));
    logger.escrow.info(chalk.gray('   • Verify the escrow is still active'));
    throw error;
  }
}

export async function getEscrowStatus(escrowId: string): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());
  const progress = new ProgressIndicator('Fetching escrow status...');

  try {
    cliLogger.general.info(chalk.cyan('📊 Escrow Status'));
    cliLogger.general.info(chalk.gray('─'.repeat(50)));
    cliLogger.general.info(`Escrow ID: ${chalk.blue(truncateAddress(escrowId))}`);
    cliLogger.general.info('');
    
    progress.start();
    
    // Get service
    const service = await getEscrowService();
    const escrowAddress = address(escrowId);
    
    // Get escrow details
    const escrowAccount = await service.getEscrow(escrowAddress);
    progress.stop();
    
    if (!escrowAccount) {
      cliLogger.general.info(chalk.red('❌ Escrow not found'));
      return;
    }
    
    // Display escrow details
    cliLogger.general.info(chalk.gray('Details:'));
    cliLogger.general.info(`  Status: ${getStatusBadge(escrowAccount.state)}`);
    cliLogger.general.info(`  Amount: ${chalk.green(lamportsToSol(escrowAccount.amount) + ' SOL')}`);
    cliLogger.general.info(`  Depositor: ${chalk.blue(truncateAddress(String(escrowAccount.depositor)))}`);
    cliLogger.general.info(`  Beneficiary: ${chalk.blue(truncateAddress(String(escrowAccount.beneficiary)))}`);
    cliLogger.general.info(`  Created: ${chalk.gray(formatDate(escrowAccount.createdAt))}`);
    
    if (escrowAccount.releaseTime) {
      cliLogger.general.info(`  Release Time: ${chalk.yellow(formatDate(escrowAccount.releaseTime))}`);
    }
    
    cliLogger.general.info('');
    
    // Check release conditions
    const releaseCheck = await service.canRelease(escrowAddress);
    cliLogger.general.info(chalk.gray('Release Conditions:'));
    cliLogger.general.info(`  Can Release: ${releaseCheck.canRelease ? chalk.green('Yes') : chalk.red('No')}`);
    if (releaseCheck.reason) {
      cliLogger.general.info(`  Reason: ${chalk.yellow(releaseCheck.reason)}`);
    }

  } catch (error) {
    progress.stop();
    logger.escrow.error(chalk.red('❌ Failed to get escrow status:'), error);
    throw error;
  }
}

export async function listEscrows(userAddress?: string): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());
  const progress = new ProgressIndicator('Loading escrows...');

  try {
    cliLogger.general.info(chalk.cyan('📋 Your Escrows'));
    cliLogger.general.info(chalk.gray('─'.repeat(50)));
    
    progress.start();
    
    // Get signer and service
    const signer = userAddress ? undefined : await getKeypairFromConfig();
    const service = await getEscrowService();
    const queryAddress = userAddress ? address(userAddress) : signer!.address;
    
    // Get user escrows
    const escrows = await service.getUserEscrows(queryAddress);
    progress.stop();
    
    if (escrows.length === 0) {
      cliLogger.general.info(chalk.gray('No escrows found'));
      return;
    }
    
    // Display escrows
    cliLogger.general.info(`Found ${chalk.cyan(escrows.length)} escrow(s)\n`);
    
    for (const { pda, account } of escrows) {
      cliLogger.general.info(chalk.blue(`Escrow ${truncateAddress(String(pda))}`));
      cliLogger.general.info(`  Status: ${getStatusBadge(account.state)}`);
      cliLogger.general.info(`  Amount: ${chalk.green(lamportsToSol(account.amount) + ' SOL')}`);
      cliLogger.general.info(`  Beneficiary: ${chalk.gray(truncateAddress(String(account.beneficiary)))}`);
      cliLogger.general.info(`  Created: ${chalk.gray(formatDate(account.createdAt))}`);
      cliLogger.general.info('');
    }
    
    cliLogger.general.info(chalk.yellow('💡 Tips:'));
    cliLogger.general.info(chalk.gray('   • Use "ghostspeak escrow status <id>" for detailed info'));
    cliLogger.general.info(chalk.gray('   • Use "ghostspeak escrow release <id>" to release funds'));

  } catch (error) {
    progress.stop();
    logger.escrow.error(chalk.red('❌ Failed to list escrows:'), error);
    throw error;
  }
}

export async function cancelEscrow(escrowId: string): Promise<void> {
  const cliLogger = new Logger(isVerboseMode());
  const progress = new ProgressIndicator('Cancelling escrow...');

  try {
    cliLogger.general.info(chalk.cyan('❌ Cancelling Escrow'));
    cliLogger.general.info(chalk.gray('─'.repeat(50)));
    cliLogger.general.info(`Escrow ID: ${chalk.blue(truncateAddress(escrowId))}`);
    cliLogger.general.info('');
    
    progress.start();
    
    // Get signer and service
    const signer = await getKeypairFromConfig();
    const service = await getEscrowService();
    const escrowAddress = address(escrowId);
    
    // Cancel escrow
    const signature = await service.cancelEscrow(signer, escrowAddress);
    
    progress.stop();
    
    cliLogger.general.info(chalk.green('✅ Escrow cancelled successfully!'));
    cliLogger.general.info('');
    cliLogger.general.info(chalk.gray('Details:'));
    cliLogger.general.info(`  Transaction: ${chalk.cyan(signature)}`);
    cliLogger.general.info(`  Escrow ID: ${chalk.blue(escrowId)}`);
    cliLogger.general.info('');
    cliLogger.general.info(chalk.yellow('💡 Note:'));
    cliLogger.general.info(chalk.gray('   • Funds will be refunded to the depositor'));
    cliLogger.general.info(chalk.gray('   • Cancellation may take a few moments to process'));

  } catch (error) {
    progress.stop();
    logger.escrow.error(chalk.red('❌ Failed to cancel escrow:'), error);
    logger.escrow.info('');
    logger.escrow.info(chalk.yellow('💡 Troubleshooting:'));
    logger.escrow.info(chalk.gray('   • Ensure you are the escrow creator'));
    logger.escrow.info(chalk.gray('   • Check if escrow is still active'));
    logger.escrow.info(chalk.gray('   • Verify work hasn\'t been submitted'));
    throw error;
  }
}

// Helper function to get status badge
function getStatusBadge(state: string): string {
  switch (state) {
    case 'pending':
      return chalk.yellow('⏳ Pending');
    case 'completed':
      return chalk.green('✅ Completed');
    case 'cancelled':
      return chalk.red('❌ Cancelled');
    default:
      return chalk.gray('❓ Unknown');
  }
}