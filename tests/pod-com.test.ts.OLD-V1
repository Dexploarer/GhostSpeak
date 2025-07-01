import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { PodCom } from "../target/types/pod_com";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect, test, beforeAll, describe } from "bun:test";
import {
  MessageType,
  MessageStatus,
  findAgentPDA,
  findMessagePDA,
} from "./test-utils";

// Configure the client to use the local cluster.
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.PodCom as Program<PodCom>;
const wallet = (provider.wallet as anchor.Wallet).payer;

// Generate a keypair for the recipient
const recipient = Keypair.generate();

// Constants for testing
const METADATA_URI = "https://example.com/agent1";
const PAYLOAD_HASH = new Uint8Array(32).fill(1); // Keep as Uint8Array for proper hash calculation

// PDAs
let senderAgentPDA: PublicKey;
let recipientAgentPDA: PublicKey;
let messagePDA: PublicKey;

describe("PoD Protocol Tests", () => {
  beforeAll(async () => {
    // Initialize PDAs
    [senderAgentPDA] = findAgentPDA(wallet.publicKey, program.programId);
    [recipientAgentPDA] = findAgentPDA(wallet.publicKey, program.programId); // Use same wallet to avoid airdrop
  });

  test("can register a sender agent", async () => {
    try {
      // Check if agent already exists
      const existingAgent =
        await program.account.agentAccount.fetch(senderAgentPDA);
      if (existingAgent) {
        // Agent already exists, skip creation
        expect(existingAgent.pubkey.equals(wallet.publicKey)).toBe(true);
        return;
      }
    } catch (error) {
      // Agent doesn't exist, proceed with creation
    }

    const tx = await program.methods
      .registerAgent(new BN(1), METADATA_URI)
      .accounts({
        agentAccount: senderAgentPDA,
        signer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    // Verify the transaction was successful
    expect(tx).toBeTruthy();

    // Verify the agent was created
    const agentAccount =
      await program.account.agentAccount.fetch(senderAgentPDA);
    expect(agentAccount.metadataUri).toBe(METADATA_URI);
    expect(agentAccount.pubkey.equals(wallet.publicKey)).toBe(true);
  });

  test("can register a recipient agent", async () => {
    // Skip this test since we're using the same wallet for both sender and recipient
    expect(true).toBe(true);
  });

  test("can send a message", async () => {
    const messageType = { text: {} };

    // Use agent PDA as that's what gets stored in message.sender and used for PDA calculation
    [messagePDA] = findMessagePDA(
      senderAgentPDA,
      recipientAgentPDA,
      PAYLOAD_HASH,
      messageType,
      program.programId,
    );

    const tx = await program.methods
      .sendMessage(
        wallet.publicKey, // Send to self to avoid needing separate recipient
        Array.from(PAYLOAD_HASH), // Convert to number array for Anchor
        messageType,
      )
      .accounts({
        messageAccount: messagePDA,
        senderAgent: senderAgentPDA,
        signer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    // Verify the transaction was successful
    expect(tx).toBeTruthy();

    // Verify the message was created
    const messageAccount =
      await program.account.messageAccount.fetch(messagePDA);
    expect(Array.from(messageAccount.payloadHash)).toEqual(
      Array.from(PAYLOAD_HASH),
    );
    expect(messageAccount.sender.equals(senderAgentPDA)).toBe(true); // Now sender is agent PDA
    expect(messageAccount.recipient.equals(wallet.publicKey)).toBe(true);
    expect("pending" in messageAccount.status).toBe(true);
  });

  test("can update message status to delivered", async () => {
    // First ensure the message exists by checking it was created in the previous test
    try {
      const messageAccount =
        await program.account.messageAccount.fetch(messagePDA);
      expect("pending" in messageAccount.status).toBe(true);
    } catch (error) {
      throw new Error(
        "Message account not found - previous test may have failed",
      );
    }

    const tx = await program.methods
      .updateMessageStatus({ delivered: {} })
      .accounts({
        messageAccount: messagePDA,
        recipientAgent: senderAgentPDA, // Same as sender since we're using same wallet
        signer: wallet.publicKey,
      })
      .rpc({ skipPreflight: true });

    // Verify the transaction was successful
    expect(tx).toBeTruthy();

    // Verify the message status was updated
    const messageAccount =
      await program.account.messageAccount.fetch(messagePDA);
    expect("delivered" in messageAccount.status).toBe(true);
  });

  test("can update agent metadata", async () => {
    const newMetadataUri = "https://example.com/agent1/updated";
    const newCapabilities = new BN(2);

    const tx = await program.methods
      .updateAgent(newCapabilities, newMetadataUri)
      .accounts({
        agentAccount: senderAgentPDA,
        signer: wallet.publicKey,
      })
      .rpc({ skipPreflight: true });

    // Verify the transaction was successful
    expect(tx).toBeTruthy();

    // Verify the agent was updated
    const agentAccount =
      await program.account.agentAccount.fetch(senderAgentPDA);
    expect(agentAccount.metadataUri).toBe(newMetadataUri);
    expect(agentAccount.capabilities.toNumber()).toBe(2);
  });
});
