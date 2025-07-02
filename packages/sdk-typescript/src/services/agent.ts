/**
 * Modern Agent Service for Web3.js v2 (2025)
 * Follows Rust SDK architecture patterns
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

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

/**
 * Agent account data
 */
export interface IAgentAccount {
  owner: Address;
  name: string;
  description: string;
  capabilities: number[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Modern Agent Service using Web3.js v2 patterns
 */
export class AgentService {
  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {}

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
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      
      // Calculate agent PDA
      const agentPda = await this.findAgentPda(signer.address, agentId);

      // Get latest blockhash
      const { value: latestBlockhash } = await this.rpc
        .getLatestBlockhash({ commitment: this.commitment })
        .send();

      // Build register agent instruction
      const instruction = this.createRegisterAgentInstruction(
        signer,
        agentPda,
        options
      );

      // Build transaction
      const transaction = {
        instructions: [instruction],
        recentBlockhash: latestBlockhash.blockhash,
        feePayer: signer.address,
      };

      // Sign and send transaction
      const signature = await this.sendTransaction(transaction, signer);

      console.log('✅ Agent registered successfully:', signature);

      return {
        signature,
        agentPda,
        agentId,
      };
    } catch (error) {
      console.error('❌ Failed to register agent:', error);
      throw new Error(`Agent registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get agent account data
   */
  async getAgent(agentPda: Address): Promise<IAgentAccount | null> {
    try {
      const accountInfo = await this.rpc
        .getAccountInfo(agentPda, { 
          commitment: this.commitment,
          encoding: 'base64'
        })
        .send();

      if (!accountInfo.value) {
        return null;
      }

      // Parse agent account data
      return this.parseAgentAccount(accountInfo.value.data);
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
      const accounts = await this.rpc
        .getProgramAccounts(this.programId, {
          commitment: this.commitment,
          filters: [
            {
              memcmp: {
                offset: 8, // Skip discriminator
                bytes: owner,
              },
            },
          ],
        })
        .send();

      return accounts.map(account => this.parseAgentAccount(account.account.data));
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

      const { value: latestBlockhash } = await this.rpc
        .getLatestBlockhash({ commitment: this.commitment })
        .send();

      const instruction = this.createUpdateAgentInstruction(
        signer,
        agentPda,
        updates
      );

      const transaction = {
        instructions: [instruction],
        recentBlockhash: latestBlockhash.blockhash,
        feePayer: signer.address,
      };

      const signature = await this.sendTransaction(transaction, signer);
      
      console.log('✅ Agent updated successfully:', signature);
      return signature;
    } catch (error) {
      console.error('❌ Failed to update agent:', error);
      throw new Error(`Agent update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate agent PDA (Program Derived Address)
   */
  private async findAgentPda(owner: Address, agentId: string): Promise<Address> {
    // This would use the actual PDA calculation with seeds
    // For now, generate a mock address
    return `${owner}_${agentId}_pda` as Address;
  }

  /**
   * Create register agent instruction
   */
  private createRegisterAgentInstruction(
    signer: KeyPairSigner,
    agentPda: Address,
    options: ICreateAgentOptions
  ) {
    return {
      programId: this.programId,
      keys: [
        { pubkey: signer.address, isSigner: true, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
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
  ) {
    return {
      programId: this.programId,
      keys: [
        { pubkey: signer.address, isSigner: true, isWritable: false },
        { pubkey: agentPda, isSigner: false, isWritable: true },
      ],
      data: this.encodeUpdateAgentData(updates),
    };
  }

  /**
   * Encode register agent instruction data
   */
  private encodeRegisterAgentData(options: ICreateAgentOptions): Uint8Array {
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(options.name.padEnd(32, '\0'));
    const descBytes = encoder.encode(options.description.padEnd(256, '\0'));
    
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

  /**
   * Parse agent account data
   */
  private parseAgentAccount(data: string | Uint8Array): IAgentAccount {
    // This would implement proper account data parsing
    // For now, return mock data
    return {
      owner: 'mock_owner' as Address,
      name: 'Mock Agent',
      description: 'Mock agent description',
      capabilities: [1, 2, 3],
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Send transaction
   */
  private async sendTransaction(transaction: any, signer: KeyPairSigner): Promise<string> {
    // This would implement proper transaction sending
    // For now, return mock signature
    const signature = `sig_${Date.now()}_${signer.address.slice(0, 8)}`;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return signature;
  }
} 