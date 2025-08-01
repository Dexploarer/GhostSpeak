#!/usr/bin/env node

import { createSolanaRpc, createKeyPairSignerFromBytes, createTransactionMessage, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions, signTransactionMessageWithSigners, pipe } from '@solana/kit';
import { address } from '@solana/addresses';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const rpc = createSolanaRpc('https://api.devnet.solana.com');

async function debugAgentSimulation() {
  console.log('🔍 Debug Agent Registration Simulation');
  
  try {
    // Load the solana-cli wallet
    const walletPath = join(homedir(), '.config', 'solana', 'id.json');
    const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'));
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(walletData));
    
    console.log('✅ Loaded wallet:', signer.address);
    
    // Check balance
    const balance = await rpc.getBalance(signer.address).send();
    console.log('💰 Balance:', Number(balance.value) / 1e9, 'SOL');
    
    if (Number(balance.value) < 10000000) {
      console.log('❌ Insufficient balance for testing');
      return;
    }
    
    // Import SDK to get the instruction
    const sdkPath = join(process.cwd(), '../sdk-typescript/dist/index.js');
    const { getRegisterAgentInstructionAsync } = await import(sdkPath);
    
    console.log('✅ Imported SDK instruction function');
    
    // Test parameters
    const programId = address('GssMyhkQPePLzByJsJadbQePZc6GtzGi22aQqW5opvUX');
    const agentId = 'test-agent-fixed';
    const agentType = 0;
    const metadataUri = 'https://example.com/metadata.json';
    
    // Manually derive PDAs to ensure they're correct
    const { getProgramDerivedAddress, getBytesEncoder, getAddressEncoder, getUtf8Encoder } = await import('@solana/kit');
    
    const [agentAccount] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // 'agent'
        getAddressEncoder().encode(signer.address),
        getUtf8Encoder().encode(agentId)
      ]
    });
    
    const [userRegistry] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([
          117, 115, 101, 114, 95, 114, 101, 103, 105, 115, 116, 114, 121
        ])), // 'user_registry'
        getAddressEncoder().encode(signer.address)
      ]
    });
    
    console.log('✅ Derived PDAs:');
    console.log('  Agent Account:', agentAccount);
    console.log('  User Registry:', userRegistry);
    
    // Create the instruction
    const instruction = await getRegisterAgentInstructionAsync({
      agentAccount,
      userRegistry,
      signer,
      systemProgram: '11111111111111111111111111111111',
      clock: 'SysvarC1ock11111111111111111111111111111111',
      agentType,
      metadataUri,
      agentId
    });
    
    console.log('✅ Created instruction');
    console.log('  Program ID:', instruction.programAddress);
    console.log('  Accounts:', instruction.accounts.length);
    console.log('  Data length:', instruction.data.length);
    
    // Build transaction
    const latestBlockhashResponse = await rpc.getLatestBlockhash().send();
    const latestBlockhash = latestBlockhashResponse.value;
    
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(signer, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) => appendTransactionMessageInstructions([instruction], tx)
    );
    
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
    
    console.log('✅ Built and signed transaction');
    
    // Simulate with detailed error capture
    try {
      const simulationResult = await rpc.simulateTransaction(signedTransaction).send();
      
      console.log('📊 Simulation Result:');
      console.log('  Success:', !simulationResult.value.err);
      console.log('  Units consumed:', simulationResult.value.unitsConsumed);
      
      if (simulationResult.value.err) {
        console.log('❌ Simulation Error:', JSON.stringify(simulationResult.value.err, null, 2));
      }
      
      if (simulationResult.value.logs) {
        console.log('📝 Program Logs:');
        simulationResult.value.logs.forEach((log, i) => {
          console.log(`  ${i + 1}. ${log}`);
        });
      }
      
    } catch (simError) {
      console.error('❌ Simulation failed:', simError);
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugAgentSimulation().catch(console.error);