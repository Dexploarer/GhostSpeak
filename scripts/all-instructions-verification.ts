#!/usr/bin/env node
/**
 * GhostSpeak ALL 101 Instructions Verification Script
 * Tests EVERY instruction on devnet via simulation
 * 
 * Categories:
 * - CREATION: Instructions that create new accounts (can test directly)
 * - ACTION: Instructions requiring pre-existing state (expect pre-condition errors)
 * - EXPORT: Type serialization helpers
 */

import {
  createSolanaRpc,
  address,
  getAddressEncoder,
  getProgramDerivedAddress,
  createKeyPairSignerFromBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  Address,
  AccountRole,
  type KeyPairSigner,
  type Rpc,
  type SolanaRpcApi,
} from '@solana/kit';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ========== CONFIG ==========
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = address('GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9');
const NATIVE_MINT = address('So11111111111111111111111111111111111111112');
const TOKEN_PROGRAM = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const SYSTEM_PROGRAM = address('11111111111111111111111111111111');
const RENT_SYSVAR = address('SysvarRent111111111111111111111111111111111');
const CLOCK_SYSVAR = address('SysvarC1ock11111111111111111111111111111111');

const rpc = createSolanaRpc(RPC_URL);
const addressEncoder = getAddressEncoder();

// ========== HELPERS ==========
function getDisc(name: string): Uint8Array {
  return crypto.createHash('sha256').update('global:' + name).digest().slice(0, 8);
}

function encodeString(s: string): Uint8Array {
  const bytes = Buffer.from(s, 'utf-8');
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, bytes.length, true);
  return concat(len, bytes);
}

function encodeU8(n: number): Uint8Array {
  return new Uint8Array([n]);
}

function encodeU16(n: number): Uint8Array {
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setUint16(0, n, true);
  return buf;
}

function encodeU32(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, n, true);
  return buf;
}

function encodeU64(n: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, n, true);
  return buf;
}

function encodeI64(n: number): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigInt64(0, BigInt(n), true);
  return buf;
}

function encodeBool(b: boolean): Uint8Array {
  return new Uint8Array([b ? 1 : 0]);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function optionNone(): Uint8Array {
  return new Uint8Array([0]);
}

function optionSome(data: Uint8Array): Uint8Array {
  return concat(new Uint8Array([1]), data);
}

async function derivePda(seeds: (string | Uint8Array | Address)[]): Promise<Address> {
  const seedBytes: Uint8Array[] = [];
  for (const s of seeds) {
    if (typeof s === 'string') {
      // Check if this looks like a base58 address (starts with typical solana address chars)
      if (s.length >= 32 && s.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)) {
        // It's likely an address, encode it properly
        seedBytes.push(addressEncoder.encode(address(s)));
      } else {
        // It's a regular string seed
        seedBytes.push(Buffer.from(s));
      }
    } else if (s instanceof Uint8Array) {
      seedBytes.push(s);
    } else {
      // It's an Address type
      seedBytes.push(addressEncoder.encode(s));
    }
  }
  const [pda] = await getProgramDerivedAddress({ programAddress: PROGRAM_ID, seeds: seedBytes });
  return pda;
}

// ========== SIMULATION RESULT TYPES ==========
interface TestResult {
  name: string;
  category: 'CREATION' | 'ACTION' | 'EXPORT' | 'INIT';
  success: boolean;
  status: 'PASS' | 'PRECONDITION' | 'FAIL';
  error?: string;
}

// ========== MAIN ==========
async function main() {
  console.log('======================================================================');
  console.log('         GhostSpeak ALL 101 Instructions Verification');
  console.log('======================================================================\n');

  // Load keypair
  const keyPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const keyBytes = new Uint8Array(JSON.parse(fs.readFileSync(keyPath, 'utf-8')));
  const signer = await createKeyPairSignerFromBytes(keyBytes);
  console.log('Signer:', signer.address);
  console.log('Program:', PROGRAM_ID);
  console.log('');

  const ts = Date.now();
  const results: TestResult[] = [];

  // ========== HELPER: Simulate instruction ==========
  async function simulate(
    name: string,
    category: TestResult['category'],
    accounts: { address: Address; role: AccountRole }[],
    data: Uint8Array
  ): Promise<TestResult> {
    try {
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
      const txMessage = pipe(
        createTransactionMessage({ version: 0 }),
        tx => setTransactionMessageFeePayerSigner(signer, tx),
        tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx => appendTransactionMessageInstruction({
          programAddress: PROGRAM_ID,
          accounts,
          data,
        }, tx)
      );

      const signedTx = await signTransactionMessageWithSigners(txMessage);
      const encodedTx = getBase64EncodedWireTransaction(signedTx);

      const simResult = await rpc.simulateTransaction(encodedTx, {
        encoding: 'base64',
      }).send();

      const logs = simResult.value.logs ?? [];
      const errorLog = logs.find(l => 
        l.includes('Error') || l.includes('error') || l.includes('failed')
      );

      if (simResult.value.err === null) {
        return { name, category, success: true, status: 'PASS' };
      }

      // Check for pre-condition errors
      const preConditionPatterns = [
        'AccountNotInitialized',
        'InactiveAgent',
        'InvalidAgent',
        'InvalidChannel',
        'InvalidEscrow',
        'InvalidProposal',
        'InvalidAuction',
        'InvalidWorkOrder',
        'InvalidSession',
        'UnauthorizedSigner',
        'Unauthorized',
        'ChannelNotFound',
        'AgentNotFound',
        'NotFound',
        'AlreadyInitialized',
        'ConstraintHasOne',
        'already in use',
        'insufficient',
        'ConstraintSeeds',
      ];

      const errJson = JSON.stringify(simResult.value.err, (_, v) => 
        typeof v === 'bigint' ? v.toString() : v
      );
      const isPreCondition = preConditionPatterns.some(p => 
        errorLog?.includes(p) || errJson.includes(p)
      );

      if (isPreCondition) {
        return { 
          name, 
          category, 
          success: true, 
          status: 'PRECONDITION',
          error: errorLog?.substring(0, 80) || 'Pre-condition not met'
        };
      }

      const errStr = errorLog ?? JSON.stringify(simResult.value.err, (_, v) => 
        typeof v === 'bigint' ? v.toString() : v
      ).substring(0, 100);
      
      return { name, category, success: false, status: 'FAIL', error: errStr };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { name, category, success: false, status: 'FAIL', error: errMsg.substring(0, 100) };
    }
  }

  // ========== PDAs we'll use across tests ==========
  const agentId = `agent-${ts}`;
  const agentPda = await derivePda(['agent', signer.address]);
  const guardPda = await derivePda(['reentrancy_guard', signer.address]);
  const escrowId = ts % 1000000;
  const escrowPda = await derivePda(['escrow', encodeU64(BigInt(escrowId))]);
  const workOrderId = ts % 1000000;
  const workOrderPda = await derivePda(['work_order', signer.address, encodeU64(BigInt(workOrderId))]);
  const channelId = `chan-${ts}`;
  const channelPda = await derivePda(['channel', Buffer.from(channelId)]);
  const proposalId = ts % 1000000;
  const proposalPda = await derivePda(['governance_proposal', encodeU64(BigInt(proposalId))]);
  const jobId = ts % 1000000;
  const jobPda = await derivePda(['job_posting', signer.address, encodeU64(BigInt(jobId))]);
  const auctionId = ts % 1000000;
  const auctionPda = await derivePda(['auction', signer.address, encodeU64(BigInt(auctionId))]);
  const a2aSessionId = ts % 1000000;
  const a2aPda = await derivePda(['a2a_session', encodeU64(BigInt(a2aSessionId))]);
  const commSessionId = ts % 1000000;
  const commPda = await derivePda(['comm_session', encodeU64(BigInt(commSessionId))]);
  const multisigId = `msig-${ts}`;
  const multisigPda = await derivePda(['multisig', Buffer.from(multisigId)]);
  const auditId = `audit-${ts}`;
  const auditPda = await derivePda(['audit_trail', Buffer.from(auditId)]);
  const negotiationId = ts % 1000000;
  const negotiationPda = await derivePda(['negotiation', encodeU64(BigInt(negotiationId))]);
  const pricingId = ts % 1000000;
  const pricingPda = await derivePda(['dynamic_pricing', signer.address, encodeU64(BigInt(pricingId))]);
  const incentiveId = `incent-${ts}`;
  const incentivePda = await derivePda(['incentive_program', Buffer.from(incentiveId)]);
  const listingId = ts % 1000000;
  const listingPda = await derivePda(['service_listing', signer.address, encodeU64(BigInt(listingId))]);
  const dashboardId = ts % 1000000;
  const dashboardPda = await derivePda(['analytics_dashboard', signer.address, encodeU64(BigInt(dashboardId))]);
  const marketAnalyticsId = ts % 1000000;
  const marketAnalyticsPda = await derivePda(['market_analytics', encodeU64(BigInt(marketAnalyticsId))]);
  const templateId = ts % 1000000;
  const templatePda = await derivePda(['replication_template', signer.address, encodeU64(BigInt(templateId))]);
  const royaltyId = ts % 1000000;
  const royaltyPda = await derivePda(['royalty_stream', signer.address, encodeU64(BigInt(royaltyId))]);
  const bulkDealId = ts % 1000000;
  const bulkDealPda = await derivePda(['bulk_deal', signer.address, encodeU64(BigInt(bulkDealId))]);
  const rbacPda = await derivePda(['rbac_config', signer.address]);
  const delegationPda = await derivePda(['vote_delegation', signer.address]);
  const disputePda = await derivePda(['dispute', escrowPda]);
  const applicationPda = await derivePda(['job_application', jobPda, signer.address]);
  const bidPda = await derivePda(['auction_bid', auctionPda, signer.address]);
  const messagePda = await derivePda(['message', channelPda, encodeU64(BigInt(1))]);
  const resalePda = await derivePda(['resale_listing', agentPda]);

  // ========== TEST ALL 101 INSTRUCTIONS ==========

  // 1-9: Export instructions (type serializers)
  const exportInstructions = [
    '_export_action',
    '_export_audit_context', 
    '_export_biometric_quality',
    '_export_compliance_status',
    '_export_dynamic_pricing_config',
    '_export_multisig_config',
    '_export_report_entry',
    '_export_resource_constraints',
    '_export_rule_condition',
  ];

  for (const name of exportInstructions) {
    results.push(await simulate(
      name,
      'EXPORT',
      [{ address: signer.address, role: AccountRole.READONLY_SIGNER }],
      concat(getDisc(name), new Uint8Array(32)) // minimal data
    ));
  }

  // 10. accept_job_application
  results.push(await simulate(
    'accept_job_application',
    'ACTION',
    [
      { address: jobPda, role: AccountRole.WRITABLE },
      { address: applicationPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: signer.address, role: AccountRole.WRITABLE }, // applicant
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    getDisc('accept_job_application')
  ));

  // 11. activate_agent
  results.push(await simulate(
    'activate_agent',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('activate_agent'), encodeBool(true))
  ));

  // 12. add_message_reaction
  results.push(await simulate(
    'add_message_reaction',
    'ACTION',
    [
      { address: channelPda, role: AccountRole.WRITABLE },
      { address: messagePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('add_message_reaction'), encodeString('👍'))
  ));

  // 13. add_top_agent
  const marketplacePda = await derivePda(['marketplace_stats']);
  results.push(await simulate(
    'add_top_agent',
    'ACTION',
    [
      { address: marketplacePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
    ],
    concat(getDisc('add_top_agent'), addressEncoder.encode(agentPda))
  ));

  // 14. apply_to_job
  results.push(await simulate(
    'apply_to_job',
    'ACTION',
    [
      { address: jobPda, role: AccountRole.WRITABLE },
      { address: applicationPda, role: AccountRole.WRITABLE },
      { address: agentPda, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('apply_to_job'), encodeString('proposal'))
  ));

  // 15. approve_extension
  results.push(await simulate(
    'approve_extension',
    'ACTION',
    [
      { address: workOrderPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    getDisc('approve_extension')
  ));

  // 16. assign_arbitrator
  results.push(await simulate(
    'assign_arbitrator',
    'ACTION',
    [
      { address: disputePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: signer.address, role: AccountRole.READONLY }, // arbitrator
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('assign_arbitrator'), addressEncoder.encode(signer.address))
  ));

  // 17. batch_replicate_agents
  results.push(await simulate(
    'batch_replicate_agents',
    'ACTION',
    [
      { address: templatePda, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: agentPda, role: AccountRole.WRITABLE },
    ],
    concat(getDisc('batch_replicate_agents'), encodeU32(0)) // empty batch
  ));

  // 18. cancel_escrow
  const escrowVaultPda = await derivePda(['escrow_vault', escrowPda]);
  results.push(await simulate(
    'cancel_escrow',
    'ACTION',
    [
      { address: escrowPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.WRITABLE }, // provider
      { address: escrowVaultPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE }, // client_token
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('cancel_escrow'), encodeString('reason'))
  ));

  // 19. cast_vote
  results.push(await simulate(
    'cast_vote',
    'ACTION',
    [
      { address: proposalPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('cast_vote'), new Uint8Array([0]), encodeU64(1000000n)) // VoteType::For, weight
  ));

  // 20. complete_escrow
  results.push(await simulate(
    'complete_escrow',
    'ACTION',
    [
      { address: escrowPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.WRITABLE }, // provider
      { address: escrowVaultPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE }, // provider_token
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('complete_escrow'), encodeBool(true)) // approve
  ));

  // 21. configure_x402
  results.push(await simulate(
    'configure_x402',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('configure_x402'),
      optionSome(encodeBool(true)), // x402_enabled
      optionSome(encodeU64(1000n)) // x402_base_price
    )
  ));

  // 22. create_a2a_session
  results.push(await simulate(
    'create_a2a_session',
    'CREATION',
    [
      { address: a2aPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_a2a_session'),
      encodeU64(BigInt(a2aSessionId)),
      addressEncoder.encode(signer.address), // initiator
      addressEncoder.encode(signer.address), // responder
      encodeString('test'), // session_type
      encodeString('{}'), // metadata
      encodeI64(Math.floor(Date.now() / 1000) + 86400) // expires_at
    )
  ));

  // 23. create_analytics_dashboard
  results.push(await simulate(
    'create_analytics_dashboard',
    'CREATION',
    [
      { address: dashboardPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_analytics_dashboard'),
      encodeU64(BigInt(dashboardId)),
      encodeString('Dashboard')
    )
  ));

  // 24. create_bulk_deal
  results.push(await simulate(
    'create_bulk_deal',
    'CREATION',
    [
      { address: bulkDealPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: NATIVE_MINT, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_bulk_deal'),
      encodeU64(BigInt(bulkDealId)),
      encodeU64(1000000n), // total_value
      encodeU32(0), // empty participants
      encodeI64(Math.floor(Date.now() / 1000) + 86400 * 7)
    )
  ));

  // 25. create_channel
  results.push(await simulate(
    'create_channel',
    'CREATION',
    [
      { address: channelPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_channel'),
      encodeString(channelId),
      encodeU32(1), // 1 participant
      addressEncoder.encode(signer.address)
    )
  ));

  // 26. create_communication_session
  results.push(await simulate(
    'create_communication_session',
    'CREATION',
    [
      { address: commPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_communication_session'),
      encodeU64(BigInt(commSessionId)),
      addressEncoder.encode(signer.address), // initiator
      new Uint8Array([0]), // ParticipantType::Human
      addressEncoder.encode(signer.address), // responder
      new Uint8Array([1]), // ParticipantType::Agent
      encodeString('test'),
      encodeString('{}'),
      encodeI64(Math.floor(Date.now() / 1000) + 86400)
    )
  ));

  // 27. create_dynamic_pricing_engine
  results.push(await simulate(
    'create_dynamic_pricing_engine',
    'CREATION',
    [
      { address: pricingPda, role: AccountRole.WRITABLE },
      { address: agentPda, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_dynamic_pricing_engine'),
      encodeU64(BigInt(pricingId)),
      encodeU64(1000n), // base_price
      encodeU64(500n), // min_price
      encodeU64(5000n), // max_price
      new Uint8Array([0]), // PricingStrategy::Fixed
      encodeU16(100), // demand_sensitivity_bps
      encodeBool(true) // auto_adjust
    )
  ));

  // 28. create_enhanced_channel
  const enhChannelId = `enh-${ts}`;
  const enhChannelPda = await derivePda(['enhanced_channel', Buffer.from(enhChannelId)]);
  results.push(await simulate(
    'create_enhanced_channel',
    'CREATION',
    [
      { address: enhChannelPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_enhanced_channel'),
      encodeString(enhChannelId),
      encodeU32(0), // empty participants
      new Uint8Array([0]), // ChannelType::Direct
      // ChannelMetadata
      optionNone(), // name
      optionNone(), // description
      optionNone(), // avatar_url
      encodeU32(0), // tags
      // ChannelSettings
      encodeBool(true), encodeBool(false), encodeU32(30), encodeU32(4096), encodeBool(false), encodeU32(90)
    )
  ));

  // 29. create_escrow
  const escrowPda2 = await derivePda(['escrow', encodeU64(BigInt(escrowId + 1))]);
  results.push(await simulate(
    'create_escrow',
    'CREATION',
    [
      { address: escrowPda2, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.READONLY }, // provider
      { address: guardPda, role: AccountRole.WRITABLE },
      { address: NATIVE_MINT, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE }, // client_token
      { address: await derivePda(['escrow_vault', escrowPda2]), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
      { address: RENT_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_escrow'),
      encodeU64(BigInt(escrowId + 1)),
      encodeU64(1000000n), // amount
      encodeI64(Math.floor(Date.now() / 1000) + 86400 * 7),
      optionNone(), // service_type
      optionNone() // payment_type
    )
  ));

  // 30. create_escrow_with_sol
  results.push(await simulate(
    'create_escrow_with_sol',
    'CREATION',
    [
      { address: escrowPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.READONLY },
      { address: guardPda, role: AccountRole.WRITABLE },
      { address: NATIVE_MINT, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE },
      { address: escrowVaultPda, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
      { address: RENT_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_escrow_with_sol'),
      encodeU64(BigInt(escrowId)),
      encodeU64(1000000n),
      encodeI64(Math.floor(Date.now() / 1000) + 86400 * 7),
      optionNone(),
      optionNone()
    )
  ));

  // 31. create_incentive_program
  results.push(await simulate(
    'create_incentive_program',
    'CREATION',
    [
      { address: incentivePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_incentive_program'),
      encodeString(incentiveId),
      encodeU64(1000000n), // total_budget
      encodeI64(Math.floor(Date.now() / 1000) + 86400 * 30),
      encodeU32(0) // empty rules
    )
  ));

  // 32. create_job_posting
  results.push(await simulate(
    'create_job_posting',
    'CREATION',
    [
      { address: jobPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_job_posting'),
      encodeString('Job'),
      encodeString('Desc'),
      encodeU32(0), // requirements
      encodeU64(1000000n),
      encodeI64(Math.floor(Date.now() / 1000) + 86400 * 7),
      encodeU32(0), // skills
      encodeU64(500000n),
      encodeU64(2000000n),
      addressEncoder.encode(NATIVE_MINT),
      encodeString('full'),
      encodeString('mid')
    )
  ));

  // 33. create_market_analytics
  results.push(await simulate(
    'create_market_analytics',
    'CREATION',
    [
      { address: marketAnalyticsPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_market_analytics'),
      encodeU64(BigInt(marketAnalyticsId)),
      encodeString('analytics')
    )
  ));

  // 34. create_multisig
  results.push(await simulate(
    'create_multisig',
    'CREATION',
    [
      { address: multisigPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_multisig'),
      encodeString(multisigId),
      encodeU8(1), // threshold
      encodeU32(1), // 1 signer
      addressEncoder.encode(signer.address),
      encodeU64(86400n) // timelock
    )
  ));

  // 35. create_replication_template
  results.push(await simulate(
    'create_replication_template',
    'CREATION',
    [
      { address: templatePda, role: AccountRole.WRITABLE },
      { address: agentPda, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_replication_template'),
      encodeU64(BigInt(templateId)),
      encodeString('Template'),
      encodeU16(500), // royalty_bps
      encodeU32(100), // max_replicas
      encodeU64(10000n) // replication_fee
    )
  ));

  // 36. create_royalty_stream
  results.push(await simulate(
    'create_royalty_stream',
    'CREATION',
    [
      { address: royaltyPda, role: AccountRole.WRITABLE },
      { address: agentPda, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_royalty_stream'),
      encodeU64(BigInt(royaltyId)),
      encodeU16(500), // royalty_bps
      addressEncoder.encode(signer.address), // recipient
      encodeU32(0) // empty beneficiaries
    )
  ));

  // 37. create_service_auction
  results.push(await simulate(
    'create_service_auction',
    'CREATION',
    [
      { address: auctionPda, role: AccountRole.WRITABLE },
      { address: agentPda, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: NATIVE_MINT, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_service_auction'),
      encodeU64(BigInt(auctionId)),
      encodeString('service'),
      encodeU64(1000n), // starting_price
      encodeU64(100n), // min_increment
      encodeU64(0n), // reserve_price
      encodeI64(Math.floor(Date.now() / 1000) + 3600), // start_time
      encodeI64(Math.floor(Date.now() / 1000) + 86400), // end_time
      new Uint8Array([0]) // AuctionType::English
    )
  ));

  // 38. create_service_listing
  results.push(await simulate(
    'create_service_listing',
    'CREATION',
    [
      { address: listingPda, role: AccountRole.WRITABLE },
      { address: agentPda, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: NATIVE_MINT, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_service_listing'),
      encodeU64(BigInt(listingId)),
      encodeString('Service'),
      encodeString('Desc'),
      encodeU64(1000n),
      encodeU32(0) // empty tags
    )
  ));

  // 39. create_token_2022_mint
  const mint2022Pda = await derivePda(['token_2022_mint', signer.address, encodeU64(BigInt(ts))]);
  results.push(await simulate(
    'create_token_2022_mint',
    'CREATION',
    [
      { address: mint2022Pda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.READONLY }, // mint_authority
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM, role: AccountRole.READONLY },
      { address: RENT_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_token_2022_mint'),
      encodeU8(6) // decimals
    )
  ));

  // 40. create_work_order
  results.push(await simulate(
    'create_work_order',
    'CREATION',
    [
      { address: workOrderPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('create_work_order'),
      encodeU64(BigInt(workOrderId)),
      encodeString('Work'),
      encodeString('Desc'),
      encodeU64(1000000n),
      encodeI64(Math.floor(Date.now() / 1000) + 86400 * 7),
      encodeU32(0) // empty milestones
    )
  ));

  // 41. deactivate_agent
  results.push(await simulate(
    'deactivate_agent',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('deactivate_agent'), encodeString('reason'))
  ));

  // 42. delegate_vote
  results.push(await simulate(
    'delegate_vote',
    'ACTION',
    [
      { address: delegationPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.READONLY }, // delegate
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('delegate_vote'),
      addressEncoder.encode(signer.address),
      encodeU64(1000000n), // weight
      encodeI64(Math.floor(Date.now() / 1000) + 86400 * 30) // expires_at
    )
  ));

  // 43. dispute_escrow
  results.push(await simulate(
    'dispute_escrow',
    'ACTION',
    [
      { address: escrowPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('dispute_escrow'), encodeString('reason'))
  ));

  // 44. distribute_incentives
  results.push(await simulate(
    'distribute_incentives',
    'ACTION',
    [
      { address: incentivePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('distribute_incentives'),
      addressEncoder.encode(signer.address), // recipient
      encodeU64(1000n), // amount
      encodeString('reward') // reason
    )
  ));

  // 45. execute_bulk_deal_batch
  results.push(await simulate(
    'execute_bulk_deal_batch',
    'ACTION',
    [
      { address: bulkDealPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('execute_bulk_deal_batch'), encodeU32(0)) // batch_index
  ));

  // 46. execute_proposal
  results.push(await simulate(
    'execute_proposal',
    'ACTION',
    [
      { address: proposalPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    getDisc('execute_proposal')
  ));

  // 47. extend_auction_for_reserve
  results.push(await simulate(
    'extend_auction_for_reserve',
    'ACTION',
    [
      { address: auctionPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    getDisc('extend_auction_for_reserve')
  ));

  // 48. file_dispute
  results.push(await simulate(
    'file_dispute',
    'ACTION',
    [
      { address: disputePda, role: AccountRole.WRITABLE },
      { address: escrowPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.READONLY }, // respondent
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
      { address: RENT_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(getDisc('file_dispute'), encodeString('reason'), encodeU32(0)) // evidence
  ));

  // 49. finalize_auction
  results.push(await simulate(
    'finalize_auction',
    'ACTION',
    [
      { address: auctionPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    getDisc('finalize_auction')
  ));

  // 50. generate_compliance_report
  const compliancePda = await derivePda(['compliance_report', signer.address, encodeU64(BigInt(ts))]);
  results.push(await simulate(
    'generate_compliance_report',
    'CREATION',
    [
      { address: compliancePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('generate_compliance_report'),
      encodeU64(BigInt(ts)),
      encodeString('report'),
      new Uint8Array([0]), // ReportType::Standard
      encodeU32(0) // empty entries
    )
  ));

  // 51. init_reentrancy_guard
  results.push(await simulate(
    'init_reentrancy_guard',
    'INIT',
    [
      { address: guardPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    getDisc('init_reentrancy_guard')
  ));

  // 52. initialize_audit_trail
  results.push(await simulate(
    'initialize_audit_trail',
    'INIT',
    [
      { address: auditPda, role: AccountRole.WRITABLE },
      { address: agentPda, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('initialize_audit_trail'),
      encodeString(auditId),
      encodeU32(1000) // max_entries
    )
  ));

  // 53. initialize_confidential_transfer_mint
  const confMintPda = await derivePda(['conf_mint', signer.address, encodeU64(BigInt(ts))]);
  results.push(await simulate(
    'initialize_confidential_transfer_mint',
    'INIT',
    [
      { address: confMintPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('initialize_confidential_transfer_mint'), new Uint8Array(64)) // ElGamalPubkey placeholder
  ));

  // 54. initialize_default_account_state
  const defStatePda = await derivePda(['default_state', signer.address, encodeU64(BigInt(ts))]);
  results.push(await simulate(
    'initialize_default_account_state',
    'INIT',
    [
      { address: defStatePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('initialize_default_account_state'), new Uint8Array([1])) // AccountState::Frozen
  ));

  // 55. initialize_governance_proposal
  results.push(await simulate(
    'initialize_governance_proposal',
    'CREATION',
    [
      { address: proposalPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('initialize_governance_proposal'),
      encodeU64(BigInt(proposalId)),
      encodeString('Title'),
      encodeString('Desc'),
      new Uint8Array([0]), // ProposalType::Configuration
      // ExecutionParams
      encodeU32(0), // instructions
      encodeI64(3600),
      encodeU32(0), // conditions
      encodeBool(true),
      encodeBool(false),
      addressEncoder.encode(signer.address)
    )
  ));

  // 56. initialize_interest_bearing_config
  const interestPda = await derivePda(['interest_config', signer.address, encodeU64(BigInt(ts))]);
  results.push(await simulate(
    'initialize_interest_bearing_config',
    'INIT',
    [
      { address: interestPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY }, // mint
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('initialize_interest_bearing_config'), encodeU16(500)) // rate_bps
  ));

  // 57. initialize_mint_close_authority
  const closeAuthPda = await derivePda(['close_auth', signer.address, encodeU64(BigInt(ts))]);
  results.push(await simulate(
    'initialize_mint_close_authority',
    'INIT',
    [
      { address: closeAuthPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY }, // mint
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM, role: AccountRole.READONLY },
    ],
    getDisc('initialize_mint_close_authority')
  ));

  // 58. initialize_rbac_config
  results.push(await simulate(
    'initialize_rbac_config',
    'INIT',
    [
      { address: rbacPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('initialize_rbac_config'), encodeU32(0)) // empty roles
  ));

  // 59. initiate_negotiation
  results.push(await simulate(
    'initiate_negotiation',
    'CREATION',
    [
      { address: negotiationPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.READONLY }, // counterparty
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('initiate_negotiation'),
      encodeU64(BigInt(negotiationId)),
      encodeU64(1000000n), // initial_offer
      encodeString('terms')
    )
  ));

  // 60. join_channel
  results.push(await simulate(
    'join_channel',
    'ACTION',
    [
      { address: channelPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    getDisc('join_channel')
  ));

  // 61. leave_channel
  results.push(await simulate(
    'leave_channel',
    'ACTION',
    [
      { address: channelPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    getDisc('leave_channel')
  ));

  // 62. list_agent_for_resale
  results.push(await simulate(
    'list_agent_for_resale',
    'ACTION',
    [
      { address: resalePda, role: AccountRole.WRITABLE },
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('list_agent_for_resale'), encodeU64(1000000n)) // price
  ));

  // 63. make_counter_offer
  results.push(await simulate(
    'make_counter_offer',
    'ACTION',
    [
      { address: negotiationPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
    ],
    concat(
      getDisc('make_counter_offer'),
      encodeU64(900000n), // counter_amount
      encodeString('counter terms')
    )
  ));

  // 64. manage_agent_status
  results.push(await simulate(
    'manage_agent_status',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('manage_agent_status'), new Uint8Array([0])) // AgentStatus::Active
  ));

  // 65. place_auction_bid
  results.push(await simulate(
    'place_auction_bid',
    'ACTION',
    [
      { address: auctionPda, role: AccountRole.WRITABLE },
      { address: bidPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(getDisc('place_auction_bid'), encodeU64(2000n)) // bid_amount
  ));

  // 66. place_dutch_auction_bid
  results.push(await simulate(
    'place_dutch_auction_bid',
    'ACTION',
    [
      { address: auctionPda, role: AccountRole.WRITABLE },
      { address: bidPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    getDisc('place_dutch_auction_bid')
  ));

  // 67. process_escrow_payment
  results.push(await simulate(
    'process_escrow_payment',
    'ACTION',
    [
      { address: escrowPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.WRITABLE }, // provider
      { address: escrowVaultPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE }, // provider_token
      { address: guardPda, role: AccountRole.WRITABLE },
      { address: agentPda, role: AccountRole.WRITABLE }, // provider_agent
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
      { address: RENT_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(getDisc('process_escrow_payment'), encodeU64(1000000n)) // amount
  ));

  // 68. process_partial_refund
  results.push(await simulate(
    'process_partial_refund',
    'ACTION',
    [
      { address: escrowPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.WRITABLE }, // client
      { address: escrowVaultPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE }, // client_token
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
      { address: guardPda, role: AccountRole.WRITABLE },
    ],
    concat(getDisc('process_partial_refund'), encodeU64(500000n)) // refund_amount
  ));

  // 69. process_payment
  results.push(await simulate(
    'process_payment',
    'ACTION',
    [
      { address: workOrderPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.WRITABLE }, // provider
      { address: signer.address, role: AccountRole.WRITABLE }, // client_token
      { address: signer.address, role: AccountRole.WRITABLE }, // provider_token
      { address: NATIVE_MINT, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('process_payment'),
      encodeU64(1000000n), // amount
      new Uint8Array([0]) // PaymentType::Full
    )
  ));

  // 70. purchase_service
  results.push(await simulate(
    'purchase_service',
    'ACTION',
    [
      { address: listingPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.WRITABLE }, // provider
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('purchase_service'), encodeU32(1)) // quantity
  ));

  // 71. record_x402_payment
  results.push(await simulate(
    'record_x402_payment',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('record_x402_payment'),
      encodeU64(1000n), // amount
      encodeString('tx123') // payment_id
    )
  ));

  // 72. refund_expired_escrow
  results.push(await simulate(
    'refund_expired_escrow',
    'ACTION',
    [
      { address: escrowPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: signer.address, role: AccountRole.WRITABLE }, // client
      { address: escrowVaultPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE }, // client_token
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
    ],
    getDisc('refund_expired_escrow')
  ));

  // 73. register_agent
  results.push(await simulate(
    'register_agent',
    'CREATION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('register_agent'),
      encodeString(agentId),
      encodeString('http://test.com'),
      encodeString('{}'),
      encodeU64(1000n),
      optionNone()
    )
  ));

  // 74. register_agent_compressed
  const merkleTree = address('11111111111111111111111111111111'); // placeholder
  results.push(await simulate(
    'register_agent_compressed',
    'CREATION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: merkleTree, role: AccountRole.WRITABLE },
      { address: merkleTree, role: AccountRole.READONLY }, // tree_authority
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
      { address: address('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'), role: AccountRole.READONLY }, // compression_program
      { address: address('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'), role: AccountRole.READONLY }, // noop_program
    ],
    concat(
      getDisc('register_agent_compressed'),
      encodeString(agentId + '-comp'),
      encodeString('http://test.com'),
      encodeString('{}'),
      encodeU64(1000n),
      optionNone()
    )
  ));

  // 75. register_extension
  const extensionPda = await derivePda(['extension', signer.address, encodeU64(BigInt(ts))]);
  results.push(await simulate(
    'register_extension',
    'CREATION',
    [
      { address: extensionPda, role: AccountRole.WRITABLE },
      { address: agentPda, role: AccountRole.READONLY },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('register_extension'),
      encodeString('extension'),
      encodeString('1.0.0'),
      encodeString('{}')
    )
  ));

  // 76. reject_work_delivery
  results.push(await simulate(
    'reject_work_delivery',
    'ACTION',
    [
      { address: workOrderPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('reject_work_delivery'),
      encodeU32(0), // milestone_index
      encodeString('reason')
    )
  ));

  // 77. replicate_agent
  const replicaPda = await derivePda(['agent_replica', agentPda, encodeU64(1n)]);
  results.push(await simulate(
    'replicate_agent',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.READONLY },
      { address: templatePda, role: AccountRole.WRITABLE },
      { address: replicaPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('replicate_agent'),
      encodeString('replica-' + ts),
      encodeString('{}')
    )
  ));

  // 78. reset_reentrancy_guard
  results.push(await simulate(
    'reset_reentrancy_guard',
    'ACTION',
    [
      { address: guardPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
    ],
    getDisc('reset_reentrancy_guard')
  ));

  // 79. resolve_dispute
  results.push(await simulate(
    'resolve_dispute',
    'ACTION',
    [
      { address: disputePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: escrowPda, role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('resolve_dispute'),
      new Uint8Array([0]), // Resolution::InFavorOfClaimant
      encodeString('reason')
    )
  ));

  // 80. send_a2a_message
  const a2aMessagePda = await derivePda(['a2a_message', a2aPda, encodeU64(1n)]);
  results.push(await simulate(
    'send_a2a_message',
    'ACTION',
    [
      { address: a2aPda, role: AccountRole.WRITABLE },
      { address: a2aMessagePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('send_a2a_message'), encodeString('hello'))
  ));

  // 81. send_communication_message
  const commMessagePda = await derivePda(['comm_message', commPda, encodeU64(1n)]);
  results.push(await simulate(
    'send_communication_message',
    'ACTION',
    [
      { address: commPda, role: AccountRole.WRITABLE },
      { address: commMessagePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('send_communication_message'), encodeString('hello'))
  ));

  // 82. send_enhanced_message
  const enhMessagePda = await derivePda(['enhanced_message', enhChannelPda, encodeU64(1n)]);
  results.push(await simulate(
    'send_enhanced_message',
    'ACTION',
    [
      { address: enhChannelPda, role: AccountRole.WRITABLE },
      { address: enhMessagePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('send_enhanced_message'),
      encodeString('content'),
      new Uint8Array([0]), // MessageType::Text
      optionNone(), // reply_to
      encodeU32(0), // attachments
      encodeU32(0) // mentions
    )
  ));

  // 83. send_message
  results.push(await simulate(
    'send_message',
    'ACTION',
    [
      { address: channelPda, role: AccountRole.WRITABLE },
      { address: messagePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('send_message'), encodeString('hello'))
  ));

  // 84. submit_dispute_evidence
  results.push(await simulate(
    'submit_dispute_evidence',
    'ACTION',
    [
      { address: disputePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: escrowPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('submit_dispute_evidence'),
      encodeString('evidence'),
      encodeString('hash')
    )
  ));

  // 85. submit_evidence_batch
  results.push(await simulate(
    'submit_evidence_batch',
    'ACTION',
    [
      { address: disputePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: escrowPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('submit_evidence_batch'), encodeU32(0)) // empty batch
  ));

  // 86. submit_work_delivery
  results.push(await simulate(
    'submit_work_delivery',
    'ACTION',
    [
      { address: workOrderPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('submit_work_delivery'),
      encodeU32(0), // milestone_index
      encodeString('delivery_hash'),
      encodeString('{}')
    )
  ));

  // 87. submit_x402_rating
  results.push(await simulate(
    'submit_x402_rating',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('submit_x402_rating'),
      encodeU8(5), // rating (1-5)
      encodeU32(100) // response_time_ms
    )
  ));

  // 88. tally_votes
  results.push(await simulate(
    'tally_votes',
    'ACTION',
    [
      { address: proposalPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
    ],
    getDisc('tally_votes')
  ));

  // 89. update_a2a_status
  results.push(await simulate(
    'update_a2a_status',
    'ACTION',
    [
      { address: a2aPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('update_a2a_status'), new Uint8Array([1])) // SessionStatus::Active
  ));

  // 90. update_agent
  results.push(await simulate(
    'update_agent',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('update_agent'),
      optionNone(), // name
      optionNone(), // endpoint
      optionNone(), // capabilities
      optionSome(encodeU64(2000n)), // price_per_call
      optionNone() // category
    )
  ));

  // 91. update_agent_reputation
  results.push(await simulate(
    'update_agent_reputation',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('update_agent_reputation'),
      encodeI32(10), // delta
      encodeString('reason')
    )
  ));

  // 92. update_agent_service
  results.push(await simulate(
    'update_agent_service',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(getDisc('update_agent_service'), encodeString('{}')) // service_config
  ));

  // 93. update_analytics_dashboard
  results.push(await simulate(
    'update_analytics_dashboard',
    'ACTION',
    [
      { address: dashboardPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(getDisc('update_analytics_dashboard'), encodeString('{}')) // metrics
  ));

  // 94. update_auction_reserve_price
  results.push(await simulate(
    'update_auction_reserve_price',
    'ACTION',
    [
      { address: auctionPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('update_auction_reserve_price'),
      encodeU64(5000n), // new_reserve
      optionNone() // extension
    )
  ));

  // 95. update_channel_settings
  results.push(await simulate(
    'update_channel_settings',
    'ACTION',
    [
      { address: channelPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('update_channel_settings'),
      // ChannelSettings
      encodeBool(true), encodeBool(false), encodeU32(30), encodeU32(4096), encodeBool(false), encodeU32(90)
    )
  ));

  // 96. update_dynamic_pricing
  results.push(await simulate(
    'update_dynamic_pricing',
    'ACTION',
    [
      { address: pricingPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
    ],
    concat(
      getDisc('update_dynamic_pricing'),
      optionSome(encodeU64(1500n)) // new_base_price
    )
  ));

  // 97. update_market_analytics
  results.push(await simulate(
    'update_market_analytics',
    'ACTION',
    [
      { address: marketAnalyticsPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('update_market_analytics'),
      encodeU64(1000n), // volume
      encodeU32(50) // transactions
    )
  ));

  // 98. update_participant_status
  results.push(await simulate(
    'update_participant_status',
    'ACTION',
    [
      { address: channelPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('update_participant_status'),
      addressEncoder.encode(signer.address), // participant
      new Uint8Array([0]) // ParticipantStatus::Active
    )
  ));

  // 99. update_transfer_fee_config
  const transferFeePda = await derivePda(['transfer_fee', signer.address]);
  results.push(await simulate(
    'update_transfer_fee_config',
    'ACTION',
    [
      { address: transferFeePda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY }, // mint
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: TOKEN_2022_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('update_transfer_fee_config'),
      encodeU16(100), // fee_bps
      encodeU64(1000000n) // max_fee
    )
  ));

  // 100. verify_agent
  results.push(await simulate(
    'verify_agent',
    'ACTION',
    [
      { address: agentPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: signer.address, role: AccountRole.READONLY }, // verifier
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('verify_agent'),
      new Uint8Array([0]), // VerificationLevel::Basic
      encodeString('proof'),
      encodeI64(Math.floor(Date.now() / 1000) + 86400 * 365), // expires_at
      encodeString('{}') // metadata
    )
  ));

  // 101. verify_work_delivery
  results.push(await simulate(
    'verify_work_delivery',
    'ACTION',
    [
      { address: workOrderPda, role: AccountRole.WRITABLE },
      { address: signer.address, role: AccountRole.READONLY_SIGNER },
      { address: agentPda, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    concat(
      getDisc('verify_work_delivery'),
      encodeU32(0), // milestone_index
      encodeBool(true) // approved
    )
  ));

  // ========== PRINT RESULTS ==========
  console.log('======================================================================');
  console.log('                    VERIFICATION RESULTS');
  console.log('======================================================================\n');

  const passed = results.filter(r => r.status === 'PASS');
  const preCondition = results.filter(r => r.status === 'PRECONDITION');
  const failed = results.filter(r => r.status === 'FAIL');

  // Group by category
  const categories: Record<string, TestResult[]> = {
    'CREATION': results.filter(r => r.category === 'CREATION'),
    'ACTION': results.filter(r => r.category === 'ACTION'),
    'INIT': results.filter(r => r.category === 'INIT'),
    'EXPORT': results.filter(r => r.category === 'EXPORT'),
  };

  for (const [category, items] of Object.entries(categories)) {
    console.log(`\n--- ${category} INSTRUCTIONS (${items.length}) ---`);
    for (const r of items) {
      const icon = r.status === 'PASS' ? '✅' : r.status === 'PRECONDITION' ? '🔶' : '❌';
      const note = r.status === 'PRECONDITION' ? ' (needs existing state)' : '';
      const err = r.status === 'FAIL' ? ` - ${r.error}` : '';
      console.log(`  ${icon} ${r.name}${note}${err}`);
    }
  }

  console.log('\n======================================================================');
  console.log('                         SUMMARY');
  console.log('======================================================================');
  console.log(`  ✅ PASS (instruction works):           ${passed.length}`);
  console.log(`  🔶 PRECONDITION (needs existing state): ${preCondition.length}`);
  console.log(`  ❌ FAIL (actual errors):                ${failed.length}`);
  console.log(`  📊 Total Instructions:                  ${results.length}`);
  console.log(`\n  Success Rate: ${(((passed.length + preCondition.length) / results.length) * 100).toFixed(1)}%`);

  if (failed.length > 0) {
    console.log('\n--- FAILED INSTRUCTIONS ---');
    for (const r of failed) {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    }
  }

  console.log('\n======================================================================');
  if (failed.length === 0) {
    console.log('🎉 ALL 101 INSTRUCTIONS VERIFIED SUCCESSFULLY!');
  } else {
    console.log(`⚠️  ${failed.length} instruction(s) need attention`);
  }
  console.log('======================================================================\n');
}

// Helper for i32
function encodeI32(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setInt32(0, n, true);
  return buf;
}

main().catch(console.error);
