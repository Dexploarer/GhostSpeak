#!/usr/bin/env bun
/**
 * Analyze On-Chain Governance Accounts
 * 
 * Identifies and categorizes all accounts owned by the GhostSpeak program
 */

import { createSolanaRpc, address, type Address } from '@solana/kit';

const PROGRAM_ID = address('GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9');
const RPC_URL = 'https://api.devnet.solana.com';

// Known discriminators from Anchor IDL (first 8 bytes of sha256("account:<AccountName>"))
// These are common Anchor account discriminators
const DISCRIMINATOR_MAP: Record<string, string> = {
  // Agent-related
  '2fa670939bc55607': 'Agent',
  '184662bf3a907b9e': 'MarketplaceConfig',
  '436d569d5e75cd09': 'WorkOrder', 
  '1fd57bbbba16da9b': 'ChannelConfig',
  '356bf0be2b49418f': 'Escrow',
  '319f636adc57db58': 'Reputation',
  'cfe38d0bc215c120': 'StakingAccount',
  // Governance-related (if present)
  'multisig': 'Multisig',
  'proposal': 'GovernanceProposal',
  'rbac': 'RbacConfig',
  'audit': 'AuditTrail'
};

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const blue = (s: string) => `\x1b[34m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

async function main() {
  console.log(`\n${cyan('═'.repeat(60))}`);
  console.log(bold('  GhostSpeak On-Chain Account Analysis'));
  console.log(cyan('═'.repeat(60)) + '\n');
  
  const rpc = createSolanaRpc(RPC_URL);
  
  // Fetch all program accounts
  console.log(blue('Fetching accounts owned by program...\n'));
  
  const accounts = await rpc.getProgramAccounts(PROGRAM_ID, {
    encoding: 'base64'
  }).send();
  
  console.log(green(`✅ Found ${accounts.length} on-chain accounts\n`));
  
  // Group by discriminator
  const grouped = new Map<string, { address: Address; data: Buffer; lamports: bigint }[]>();
  
  for (const acc of accounts) {
    const data = Buffer.from(acc.account.data[0], 'base64');
    const disc = data.slice(0, 8).toString('hex');
    
    if (!grouped.has(disc)) {
      grouped.set(disc, []);
    }
    grouped.get(disc)!.push({
      address: acc.pubkey,
      data,
      lamports: acc.account.lamports
    });
  }
  
  // Print summary
  console.log(bold('Account Types by Discriminator:\n'));
  console.log(`  ${'Discriminator'.padEnd(20)} ${'Type'.padEnd(20)} ${'Count'.padEnd(8)} ${'Total SOL'}`);
  console.log(`  ${'-'.repeat(65)}`);
  
  let totalLamports = 0n;
  
  for (const [disc, accs] of grouped.entries()) {
    const typeName = DISCRIMINATOR_MAP[disc] || 'Unknown';
    const totalForType = accs.reduce((sum, a) => sum + a.lamports, 0n);
    totalLamports += totalForType;
    
    console.log(`  ${disc.padEnd(20)} ${typeName.padEnd(20)} ${String(accs.length).padEnd(8)} ${(Number(totalForType) / 1e9).toFixed(4)} SOL`);
  }
  
  console.log(`  ${'-'.repeat(65)}`);
  console.log(`  ${'TOTAL'.padEnd(20)} ${' '.padEnd(20)} ${String(accounts.length).padEnd(8)} ${(Number(totalLamports) / 1e9).toFixed(4)} SOL`);
  
  // Print detailed accounts
  console.log(`\n${bold('Detailed Account List:')}\n`);
  
  for (const [disc, accs] of grouped.entries()) {
    const typeName = DISCRIMINATOR_MAP[disc] || 'Unknown';
    console.log(yellow(`\n${typeName} (${accs.length} accounts):`));
    
    for (const acc of accs.slice(0, 5)) { // Show max 5 per type
      const solBalance = (Number(acc.lamports) / 1e9).toFixed(4);
      console.log(`  ${acc.address}`);
      console.log(`    Balance: ${solBalance} SOL | Data: ${acc.data.length} bytes`);
    }
    
    if (accs.length > 5) {
      console.log(`  ... and ${accs.length - 5} more`);
    }
  }
  
  // Summary
  console.log(`\n${cyan('═'.repeat(60))}`);
  console.log(bold('  Summary'));
  console.log(cyan('═'.repeat(60)));
  
  console.log(`\n${green('✅')} Program: ${PROGRAM_ID}`);
  console.log(`${green('✅')} Network: Solana Devnet`);
  console.log(`${green('✅')} Total Accounts: ${accounts.length}`);
  console.log(`${green('✅')} Total Value Locked: ${(Number(totalLamports) / 1e9).toFixed(4)} SOL`);
  console.log(`${green('✅')} Account Types: ${grouped.size}\n`);
}

main().catch(e => {
  console.error(`Error: ${e}`);
  process.exit(1);
});
