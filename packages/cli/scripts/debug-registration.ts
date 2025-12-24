
import { bootstrapServices } from '../src/core/bootstrap.js';
import { initializeClient, toSDKSigner } from '../src/utils/client.js';
import { 
  getRegisterAgentInstructionAsync,
  GHOSTSPEAK_PROGRAM_ID
} from '@ghostspeak/sdk';
import chalk from 'chalk';

async function debugRegistration() {
  console.log(chalk.cyan('🔍 Debugging Agent Registration...'));

  try {
    bootstrapServices();
    const { wallet } = await initializeClient('devnet');
    
    console.log('1. Wallet loaded:', wallet.address);
    console.log('   Wallet has signTransactions?:', typeof (wallet as any).signTransactions);
    console.log('   Wallet keys:', Object.keys(wallet));
    
    const sdkSigner = toSDKSigner(wallet);
    console.log('2. SDK Signer:', sdkSigner.address);
    console.log('   SDK Signer has signTransactions?:', typeof (sdkSigner as any).signTransactions);
    console.log('   SDK Signer keys:', Object.keys(sdkSigner));
    
    // Check if signer is recognized as TransactionSigner
    const { isTransactionSigner } = await import('@solana/kit');
    console.log('3. isTransactionSigner(wallet):', isTransactionSigner(wallet));
    console.log('   isTransactionSigner(sdkSigner):', isTransactionSigner(sdkSigner));

    // Get the instruction
    const agentId = 'test-debug-' + Date.now();
    console.log('4. Generating instruction for agentId:', agentId);
    
    const ix = await getRegisterAgentInstructionAsync({
        signer: sdkSigner,
        agentType: 0,
        name: 'Debug Agent',
        description: 'Debug Description',
        metadataUri: '',
        agentId
    });
    
    console.log('5. Instruction generated with', ix.accounts.length, 'accounts:');
    ix.accounts.forEach((acc: any, i: number) => {
        console.log(`   Account ${i}:`);
        console.log(`     - address: ${acc.address}`);
        console.log(`     - role: ${acc.role}`);
        console.log(`     - has signer?: ${!!acc.signer}`);
        if (acc.signer) {
            console.log(`     - signer.address: ${acc.signer.address}`);
        }
    });
    
    // Check account roles
    const AccountRole = {
        READONLY: 0,
        WRITABLE: 1,
        READONLY_SIGNER: 2,
        WRITABLE_SIGNER: 3
    };
    console.log('6. Account Role Mapping:', AccountRole);
    

  } catch (error) {
    console.error(chalk.red('❌ Debug failed:'), error);
  }
}

debugRegistration();
