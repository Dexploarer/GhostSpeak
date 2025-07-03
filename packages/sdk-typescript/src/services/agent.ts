/**
 * Modern Agent Service for Web3.js v2 (2025)
 * Follows Rust SDK architecture patterns
 */

import type { Address } from '@solana/addresses';
import { getAddressEncoder } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import { sendAndConfirmTransactionFactory, findProgramAddress } from '../utils/transaction-helpers';
import type { IInstruction } from '@solana/instructions';

/**
 * Agent creation options
 */
export interface ICreateAgentOptions {
  name: string;
  description: string;
  capabilities: number[];
  metadata?: Record<string, unknown>;
}

/**
 * Agent registration result
 */
export interface IAgentRegistrationResult {
  signature: string;
  agentPda: Address;
  agentId: string;
}

export interface IAgentAccount {
  pubkey: Address;
  capabilities: number;
  metadataUri: string;
  reputation: number;
  lastUpdated: number;
  invitesSent: number;
  lastInviteAt: number;
  bump: number;
}

/**
 * Modern Agent Service using Web3.js v2 patterns
 */
export class AgentService {
  private sendAndConfirmTransaction: ReturnType<typeof sendAndConfirmTransactionFactory>;
  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {
    this.sendAndConfirmTransaction = sendAndConfirmTransactionFactory(this.rpc);
  }

  /**
   * Register a new agent on-chain
   */
  async registerAgent(
    signer: KeyPairSigner,
    options: ICreateAgentOptions
  ): Promise<IAgentRegistrationResult> {
    try {
      console.log('🤖 Registering agent on-chain:', options.name);

      // Generate unique agent ID
      const agentId = Date.now().toString();
      
      // Calculate agent PDA
      const agentPda = await this.findAgentPda(signer.address, agentId);

      // Build register agent instruction
      const instruction = this.createRegisterAgentInstruction(
        signer,
        agentPda,
        options
      );

      // Sign and send transaction
      const result = await this.sendAndConfirmTransaction([instruction], [signer]);

      console.log('✅ Agent registered successfully:', result.signature);

      return {
        signature: result.signature,
        agentPda,
        agentId,
      };
    } catch (error) {
      console.error('❌ Failed to register agent:', error);
      throw new Error(
        `Agent registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get agent account data
   */
  async getAgent(agentPda: Address): Promise<IAgentAccount | null> {
    try {
      const accountResult = await this.rpc
        .getAccountInfo(agentPda, { commitment: this.commitment })
        .send();

      if (!accountResult.value) {
        return null;
      }

      // Parse real account data
      const accountData = accountResult.value.data;
      if (Array.isArray(accountData) && accountData.length >= 2) {
        const [data] = accountData;
        return this.parseAgentAccountData(agentPda, data);
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get agent:', error);
      return null;
    }
  }

  /**
   * List all agents for a user
   */
  async listUserAgents(owner: Address): Promise<IAgentAccount[]> {
    try {
      const accountsResult = await this.rpc
        .getProgramAccounts(this.programId, {
          commitment: this.commitment,
          filters: [
            {
              memcmp: {
                offset: 8n,
                bytes: owner,
                encoding: 'base58',
              },
            },
          ],
        })
        .send();

      const accounts = accountsResult.value ?? [];
      const agentAccounts: IAgentAccount[] = [];
      
      for (const { pubkey } of accounts) {
        const agent = await this.getAgent(pubkey);
        if (agent) agentAccounts.push(agent);
      }
      
      return agentAccounts;
    } catch (error) {
      console.error('❌ Failed to list user agents:', error);
      return [];
    }
  }

  /**
   * Update agent metadata
   */
  async updateAgent(
    signer: KeyPairSigner,
    agentPda: Address,
    updates: Partial<ICreateAgentOptions>
  ): Promise<string> {
    try {
      console.log('🔄 Updating agent:', agentPda);

      const instruction = this.createUpdateAgentInstruction(
        signer,
        agentPda,
        updates
      );

      const result = await this.sendAndConfirmTransaction([instruction], [signer]);
      
      console.log('✅ Agent updated successfully:', result.signature);
      return result.signature;
    } catch (error) {
      console.error('❌ Failed to update agent:', error);
      throw new Error(`Agent update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate agent PDA (Program Derived Address)
   */
  private async findAgentPda(owner: Address, agentId: string): Promise<Address> {
    const ownerBytes = getAddressEncoder().encode(owner);
    const agentIdBytes = new TextEncoder().encode(agentId);
    const agentSeed = new TextEncoder().encode('agent');
    
    // For now, create a deterministic address
    // In production, this would use actual PDA derivation
    const combinedSeed = `agent_${owner}_${agentId}`;
    const deterministicAddress = this.generateDeterministicAddress(combinedSeed);
    
    return findProgramAddress(
        [
            'agent',
            new Uint8Array(ownerBytes),
            new Uint8Array(agentIdBytes),
            new Uint8Array(agentSeed)
        ],
        this.programId
    );
  }

  /**
   * Generate deterministic address for PDA simulation
   */
  private generateDeterministicAddress(seed: string): string {
    // Simple deterministic address generation
    // In production, this would use proper Solana PDA derivation
    const hash = this.simpleHash(seed);
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    
    for (let i = 0; i < 44; i++) {
      result += base58Chars[hash % base58Chars.length];
      hash = (hash * 31) % 1000000007;
    }
    
    return result;
  }

  /**
   * Simple hash function for deterministic address generation
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Parse agent account data from on-chain
   */
  private parseAgentAccountData(pubkey: Address, data: string): IAgentAccount {
    // Decode base64 account data
    const buffer = Buffer.from(data, 'base64');
    
    // Parse the account structure
    // This is a simplified parser - in production you'd use proper serialization
    let offset = 8; // Skip discriminator
    
    const capabilities = buffer.readUInt32LE(offset);
    offset += 4;
    
    const reputation = buffer.readUInt32LE(offset);
    offset += 4;
    
    const lastUpdated = buffer.readBigUInt64LE(offset);
    offset += 8;
    
    return {
      pubkey,
      capabilities,
      metadataUri: '', // Would parse from buffer in production
      reputation,
      lastUpdated: Number(lastUpdated),
      invitesSent: 0,
      lastInviteAt: 0,
      bump: 255, // Standard PDA bump
    };
  }

  /**
   * Create register agent instruction
   */
  private createRegisterAgentInstruction(
    signer: KeyPairSigner,
    agentPda: Address,
    options: ICreateAgentOptions
  ): IInstruction {
    return {
      programAddress: this.programId,
      accounts: [
        { address: signer.address, role: 'writable-signer' },
        { address: agentPda, role: 'writable' },
      ],
      data: this.encodeRegisterAgentData(options),
    };
  }

  /**
   * Create update agent instruction
   */
  private createUpdateAgentInstruction(
    signer: KeyPairSigner,
    agentPda: Address,
    updates: Partial<ICreateAgentOptions>
  ): IInstruction {
    return {
      programAddress: this.programId,
      accounts: [
        { address: signer.address, role: 'readonly-signer' },
        { address: agentPda, role: 'writable' },
      ],
      data: this.encodeUpdateAgentData(updates),
    };
  }

  /**
   * Encode register agent instruction data
   */
  private encodeRegisterAgentData(options: ICreateAgentOptions): Uint8Array {
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(options.name.padEnd(32, ' '));
    const descBytes = encoder.encode(options.description.padEnd(256, ' '));
    
    const data = new Uint8Array(8 + 32 + 256 + 4 + options.capabilities.length * 4);
    let offset = 0;

    // Instruction discriminator (8 bytes)
    data.set([1, 0, 0, 0, 0, 0, 0, 0], offset);
    offset += 8;

    // Name (32 bytes)
    data.set(nameBytes.slice(0, 32), offset);
    offset += 32;

    // Description (256 bytes)
    data.set(descBytes.slice(0, 256), offset);
    offset += 256;

    // Capabilities count (4 bytes)
    const capCount = new Uint32Array([options.capabilities.length]);
    data.set(new Uint8Array(capCount.buffer), offset);
    offset += 4;

    // Capabilities array
    for (const cap of options.capabilities) {
      const capArray = new Uint32Array([cap]);
      data.set(new Uint8Array(capArray.buffer), offset);
      offset += 4;
    }

    return data;
  }

  /**
   * Encode update agent instruction data
   */
  private encodeUpdateAgentData(updates: Partial<ICreateAgentOptions>): Uint8Array {
    const encoder = new TextEncoder();
    
    // Simplified update data encoding
    const updateData = JSON.stringify(updates);
    const dataBytes = encoder.encode(updateData);
    
    const data = new Uint8Array(8 + 4 + dataBytes.length);
    let offset = 0;

    // Instruction discriminator (8 bytes)
    data.set([2, 0, 0, 0, 0, 0, 0, 0], offset);
    offset += 8;

    // Data length (4 bytes)
    const lengthArray = new Uint32Array([dataBytes.length]);
    data.set(new Uint8Array(lengthArray.buffer), offset);
    offset += 4;

    // Update data
    data.set(dataBytes, offset);

    return data;
  }
} 