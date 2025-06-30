/**
 * Message Service - Real on-chain messaging
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import {
  getSendMessageInstructionAsync
} from '../generated-v2/instructions';
import { sendTransaction } from '../utils/transaction-sender';
import { decodeMessageAccount } from '../generated-v2/accounts';
import { IMessageAccount } from '../types';

export interface ISendMessageOptions {
  recipient: Address;
  payload: string;
  messageType: 'text' | 'file' | 'image';
  content: string;
}

/**
 * Service for managing direct messages on the podAI Protocol
 */
export class MessageService {
  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {}

  /**
   * Send a direct message to another agent
   */
  async sendMessage(
    signer: KeyPairSigner,
    options: ISendMessageOptions
  ): Promise<string> {
    console.log('📨 Sending direct message on-chain to:', options.recipient);
    
    try {
      // Map string message type to numeric value
      const messageTypeNum = options.messageType === 'text' ? 0 : 
                             options.messageType === 'image' ? 1 : 
                             options.messageType === 'file' ? 3 : 0;

      // Create the send message instruction
      const instruction = await getSendMessageInstructionAsync({
        sender: signer,
        recipient: options.recipient,
        payload: options.payload,
        messageType: messageTypeNum,
        expirationDays: 30, // Default 30 days expiration
      });

      // Send transaction using real Web3.js v2 transaction sending
      const result = await sendTransaction({
        rpc: this.rpc,
        instructions: [instruction],
        signer,
        commitment: this.commitment,
      });

      const signature = result.signature;

      console.log('✅ Message sent successfully:', signature);
      return signature;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get messages for an agent
   */
  async getMessagesForAgent(agentAddress: Address): Promise<IMessageAccount[]> {
    console.log('📬 Fetching messages from blockchain for:', agentAddress);
    
    try {
      // Get program accounts filtered by recipient
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: [
          {
            dataSize: 300, // Approximate size of message account
          },
          {
            memcmp: {
              offset: 40, // Skip discriminator and sender (8 + 32 bytes)
              bytes: agentAddress, // Filter by recipient
            },
          },
        ],
        encoding: 'base64',
      }).send();

      const messages: IMessageAccount[] = [];
      
      for (const account of accounts.value) {
        try {
          // Parse account data using generated decoders
          try {
            const decodedMessage = decodeMessageAccount(account);
            const messageData: IMessageAccount = {
              pubkey: account.pubkey,
              sender: decodedMessage.data.sender,
              recipient: decodedMessage.data.recipient,
              payloadHash: decodedMessage.data.payloadHash,
              payload: 'Encrypted message content', // Content is hash on-chain
              messageType: Number(decodedMessage.data.messageType),
              timestamp: Number(decodedMessage.data.timestamp),
              createdAt: Number(decodedMessage.data.timestamp),
              expiresAt: Number(decodedMessage.data.expiresAt),
              status: decodedMessage.data.status === 1 ? 'delivered' : 'pending',
              bump: decodedMessage.data.bump || 0,
            };
            
            messages.push(messageData);
          } catch (decodeError) {
            console.warn('Failed to decode message account:', decodeError);
            // Skip invalid message accounts
          }
        } catch (parseError) {
          console.warn('Failed to parse message account:', parseError);
        }
      }
      
      console.log(`✅ Found ${messages.length} messages for agent`);
      return messages;
    } catch (error) {
      console.error('❌ Failed to fetch messages:', error);
      return [];
    }
  }
} 