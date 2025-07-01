import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { IDL, PodCom } from "../sdk/src/pod_com";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect, test, beforeAll, describe } from "bun:test";
import { findAgentPDA, findMessagePDA } from "./test-utils";

// Create test wallet and connection for devnet
const testWallet = Keypair.generate();
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const provider = new AnchorProvider(connection, new anchor.Wallet(testWallet), {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const program = new Program(IDL, provider) as Program<PodCom>;

// Constants for testing
const METADATA_URI = "https://example.com/test-agent";
const PAYLOAD_HASH = new Uint8Array(32).fill(42); // Different hash to avoid conflicts

// PDAs
let agentPDA: PublicKey;
let messagePDA: PublicKey;

describe("PoD Protocol Clean Tests", () => {
  beforeAll(async () => {
    // Airdrop SOL to test wallet
    const airdropSignature = await provider.connection.requestAirdrop(
      testWallet.publicKey,
      2 * LAMPORTS_PER_SOL,
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: airdropSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    // Initialize PDAs
    [agentPDA] = findAgentPDA(testWallet.publicKey, program.programId);
  });

  test("can register a test agent", async () => {
    const tx = await program.methods
      .registerAgent(new BN(1), METADATA_URI)
      .accounts({
        agentAccount: agentPDA,
        signer: testWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([testWallet])
      .rpc({ skipPreflight: true });

    expect(tx).toBeTruthy();

    // Verify the agent was created
    const agentAccount = await program.account.agentAccount.fetch(agentPDA);
    expect(agentAccount.metadataUri).toBe(METADATA_URI);
    expect(agentAccount.pubkey.equals(testWallet.publicKey)).toBe(true);
  });

  test("can send a message using fresh account", async () => {
    const messageType = { text: {} };

    // Calculate message PDA
    [messagePDA] = findMessagePDA(
      agentPDA,
      testWallet.publicKey,
      PAYLOAD_HASH,
      messageType,
      program.programId,
    );

    const tx = await program.methods
      .sendMessage(testWallet.publicKey, Array.from(PAYLOAD_HASH), messageType)
      .accounts({
        messageAccount: messagePDA,
        senderAgent: agentPDA,
        signer: testWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([testWallet])
      .rpc({ skipPreflight: true });

    expect(tx).toBeTruthy();

    // Verify the message was created
    const messageAccount =
      await program.account.messageAccount.fetch(messagePDA);
    expect(Array.from(messageAccount.payloadHash)).toEqual(
      Array.from(PAYLOAD_HASH),
    );
    expect(messageAccount.sender.equals(testWallet.publicKey)).toBe(true);
    expect(messageAccount.recipient.equals(testWallet.publicKey)).toBe(true);
    expect("pending" in messageAccount.status).toBe(true);
  });

  test("can update message status", async () => {
    const tx = await program.methods
      .updateMessageStatus({ delivered: {} })
      .accounts({
        messageAccount: messagePDA,
        recipientAgent: agentPDA,
        signer: testWallet.publicKey,
      })
      .signers([testWallet])
      .rpc({ skipPreflight: true });

    expect(tx).toBeTruthy();

    // Verify the message status was updated
    const messageAccount =
      await program.account.messageAccount.fetch(messagePDA);
    expect("delivered" in messageAccount.status).toBe(true);
  });
});
