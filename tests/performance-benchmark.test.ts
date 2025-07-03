import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { PodCom } from "../target/types/pod_com";
import { generateKeyPairSigner, type KeyPairSigner } from "@solana/signers";
import { address, type Address } from "@solana/addresses";
// Keep legacy imports for Anchor compatibility
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Transaction,
} from "@solana/web3.js";
import { expect, test, beforeAll, describe } from "bun:test";
import {
  MessageType,
  findAgentPDA,
  findChannelPDA,
  findEscrowPDA,
  findInvitationPDA,
  findParticipantPDA,
} from "./test-utils";

// Configure the client to use the local cluster.
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.PodCom as Program<PodCom>;
const wallet = (provider.wallet as anchor.Wallet).payer;

// Performance tracking
interface BenchmarkResult {
  instruction: string;
  computeUnits: number;
  accountsCreated: number;
  accountsRead: number;
  accountsWritten: number;
  transactionSize: number;
  timestamp: number;
}

const benchmarkResults: BenchmarkResult[] = [];

/**
 * Helper function to measure compute units for a transaction
 */
async function measureComputeUnits(
  instructionName: string,
  transaction: Transaction,
  signers: KeyPairSigner[] = []
): Promise<BenchmarkResult> {
  // Add compute budget instruction to get precise CU measurement
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_400_000, // Max CU limit for measurement
  });
  
  transaction.instructions.unshift(computeBudgetIx);
  
  // Send and confirm transaction
  const signature = await provider.sendAndConfirm(transaction, signers);
  
  // Get transaction details to analyze compute unit usage
  const txDetails = await provider.connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!txDetails) {
    throw new Error("Failed to get transaction details");
  }

  // Extract compute unit consumption from logs
  let computeUnits = 0;
  const logs = txDetails.meta?.logMessages || [];
  
  for (const log of logs) {
    if (log.includes("consumed")) {
      const match = log.match(/consumed (\d+) of/);
      if (match) {
        computeUnits = parseInt(match[1]);
        break;
      }
    }
  }

  // Count account interactions
  const accounts = txDetails.transaction.message.getAccountKeys();
  const accountsRead = accounts.length;
  const accountsWritten = txDetails.meta?.postBalances?.length || 0;
  const accountsCreated = txDetails.meta?.postBalances?.filter(
    (balance, index) => (txDetails.meta?.preBalances?.[index] || 0) === 0 && balance > 0
  ).length || 0;

  const result: BenchmarkResult = {
    instruction: instructionName,
    computeUnits,
    accountsCreated,
    accountsRead,
    accountsWritten,
    transactionSize: txDetails.transaction.message.serialize().length,
    timestamp: Date.now(),
  };

  benchmarkResults.push(result);
  console.log(`📊 ${instructionName}: ${computeUnits} CU, ${result.transactionSize} bytes`);
  
  return result;
}

describe("Performance Benchmarking - Compute Unit Analysis", () => {
  let agentPDA: PublicKey;
  let secondAgentPDA: PublicKey;
  let channelPDA: PublicKey;
  let escrowPDA: PublicKey;
  let secondKeypair: Keypair;

  beforeAll(async () => {
    // Setup test accounts
    secondKeypair = Keypair.generate();
    await provider.connection.requestAirdrop(secondKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Initialize PDAs
    [agentPDA] = findAgentPDA(wallet.publicKey, program.programId);
    [secondAgentPDA] = findAgentPDA(secondKeypair.publicKey, program.programId);
    [channelPDA] = findChannelPDA(wallet.publicKey, "perf-test", program.programId);
    [escrowPDA] = findEscrowPDA(channelPDA, wallet.publicKey, program.programId);
  });

  test("Benchmark: register_agent instruction", async () => {
    const tx = await program.methods
      .registerAgent(new BN(1), "https://example.com/agent1")
      .accounts({
        agentAccount: agentPDA,
        signer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const result = await measureComputeUnits("register_agent", tx);
    
    // Performance assertions
    expect(result.computeUnits).toBeLessThan(50_000); // Should be efficient
    expect(result.accountsCreated).toBe(1); // Creates agent account
    expect(result.transactionSize).toBeLessThan(1000); // Reasonable transaction size
  });

  test("Benchmark: update_agent instruction", async () => {
    const tx = await program.methods
      .updateAgent(new BN(2), "https://example.com/agent1/updated")
      .accounts({
        agentAccount: agentPDA,
        signer: wallet.publicKey,
      })
      .transaction();

    const result = await measureComputeUnits("update_agent", tx);
    
    // Should be very efficient as it only updates existing account
    expect(result.computeUnits).toBeLessThan(30_000);
    expect(result.accountsCreated).toBe(0); // No new accounts
  });

  test("Benchmark: create_channel instruction", async () => {
    const tx = await program.methods
      .createChannel(
        "perf-test",
        "Performance testing channel",
        { public: {} },
        100,
        0
      )
      .accounts({
        channelAccount: channelPDA,
        creator: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const result = await measureComputeUnits("create_channel", tx);
    
    expect(result.computeUnits).toBeLessThan(70_000); // Channel creation overhead
    expect(result.accountsCreated).toBe(1); // Creates channel account
  });

  test("Benchmark: create_channel_v2 instruction (enhanced)", async () => {
    const channelV2Name = "perf-test-v2";
    const [channelV2PDA] = findChannelPDA(wallet.publicKey, channelV2Name, program.programId);
    const [participantPDA] = findParticipantPDA(channelV2PDA, agentPDA, program.programId);

    const tx = await program.methods
      .createChannelV2(
        channelV2Name,
        "Enhanced performance testing channel",
        { public: {} },
        100,
        0
      )
      .accounts({
        agentAccount: agentPDA,
        channelAccount: channelV2PDA,
        participantAccount: participantPDA,
        creator: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const result = await measureComputeUnits("create_channel_v2", tx);
    
    // V2 creates both channel and participant accounts
    expect(result.computeUnits).toBeLessThan(100_000);
    expect(result.accountsCreated).toBe(2); // Channel + participant
  });

  test("Benchmark: join_channel instruction", async () => {
    // Register second agent first
    await program.methods
      .registerAgent(new BN(1), "https://example.com/agent2")
      .accounts({
        agentAccount: secondAgentPDA,
        signer: secondKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([secondKeypair])
      .rpc();

    const [participantPDA] = findParticipantPDA(channelPDA, secondAgentPDA, program.programId);

    const tx = await program.methods
      .joinChannel()
      .accounts({
        channelAccount: channelPDA,
        participantAccount: participantPDA,
        agentAccount: secondAgentPDA,
        invitationAccount: null,
        escrowAccount: null,
        user: secondKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const result = await measureComputeUnits("join_channel", tx, [secondKeypair]);
    
    expect(result.computeUnits).toBeLessThan(80_000); // Join operation overhead
    expect(result.accountsCreated).toBe(1); // Creates participant account
  });

  test("Benchmark: broadcast_message instruction", async () => {
    const [participantPDA] = findParticipantPDA(channelPDA, agentPDA, program.programId);
    const [messagePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("channel_message"),
        channelPDA.toBuffer(),
        wallet.publicKey.toBuffer(),
        Buffer.from([1])
      ],
      program.programId
    );

    const tx = await program.methods
      .broadcastMessage(
        "Performance test message",
        { text: {} },
        null,
        1
      )
      .accounts({
        channelAccount: channelPDA,
        participantAccount: participantPDA,
        agentAccount: agentPDA,
        messageAccount: messagePDA,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const result = await measureComputeUnits("broadcast_message", tx);
    
    // Message broadcasting with rate limiting
    expect(result.computeUnits).toBeLessThan(90_000);
    expect(result.accountsCreated).toBe(1); // Creates message account
  });

  test("Benchmark: deposit_escrow instruction", async () => {
    const depositAmount = LAMPORTS_PER_SOL / 1000; // 0.001 SOL

    const tx = await program.methods
      .depositEscrow(new BN(depositAmount))
      .accounts({
        escrowAccount: escrowPDA,
        channelAccount: channelPDA,
        depositor: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const result = await measureComputeUnits("deposit_escrow", tx);
    
    // Escrow operations involve SOL transfers
    expect(result.computeUnits).toBeLessThan(60_000);
    expect(result.accountsCreated).toBe(1); // Creates escrow account
  });

  test("Benchmark: withdraw_escrow instruction", async () => {
    const withdrawAmount = LAMPORTS_PER_SOL / 2000; // 0.0005 SOL

    const tx = await program.methods
      .withdrawEscrow(new BN(withdrawAmount))
      .accounts({
        escrowAccount: escrowPDA,
        channelAccount: channelPDA,
        depositor: wallet.publicKey,
      })
      .transaction();

    const result = await measureComputeUnits("withdraw_escrow", tx);
    
    // Withdrawal is typically more efficient than deposit
    expect(result.computeUnits).toBeLessThan(40_000);
    expect(result.accountsCreated).toBe(0); // No new accounts
  });

  test("Performance Summary and Analysis", async () => {
    console.log("\n📊 PERFORMANCE BENCHMARK SUMMARY");
    console.log("=====================================");
    
    // Sort results by compute units
    const sortedResults = [...benchmarkResults].sort((a, b) => b.computeUnits - a.computeUnits);
    
    let totalCU = 0;
    let totalSize = 0;
    
    for (const result of sortedResults) {
      console.log(
        `${result.instruction.padEnd(20)} | ${result.computeUnits.toString().padStart(6)} CU | ${result.transactionSize.toString().padStart(4)} bytes | ${result.accountsCreated} created`
      );
      totalCU += result.computeUnits;
      totalSize += result.transactionSize;
    }
    
    console.log("=====================================");
    console.log(`Total CU consumed: ${totalCU}`);
    console.log(`Average CU per instruction: ${Math.round(totalCU / benchmarkResults.length)}`);
    console.log(`Total transaction size: ${totalSize} bytes`);
    console.log(`Average transaction size: ${Math.round(totalSize / benchmarkResults.length)} bytes`);
    
    // Performance thresholds based on Solana best practices
    const maxCUPerInstruction = 200_000; // Conservative limit
    const maxTransactionSize = 1232; // Solana transaction size limit
    
    // Check for performance regressions
    for (const result of benchmarkResults) {
      if (result.computeUnits > maxCUPerInstruction) {
        console.warn(`⚠️  ${result.instruction} exceeds CU threshold: ${result.computeUnits} > ${maxCUPerInstruction}`);
      }
      if (result.transactionSize > maxTransactionSize) {
        console.warn(`⚠️  ${result.instruction} exceeds size threshold: ${result.transactionSize} > ${maxTransactionSize}`);
      }
    }
    
    // All instructions should be under reasonable limits
    expect(sortedResults[0].computeUnits).toBeLessThan(maxCUPerInstruction);
    expect(Math.max(...benchmarkResults.map(r => r.transactionSize))).toBeLessThan(maxTransactionSize);
    
    console.log("\n✅ All performance benchmarks passed!");
  });
});

// Export benchmark results for CI analysis
if (typeof globalThis !== 'undefined') {
  (globalThis as any).benchmarkResults = benchmarkResults;
}