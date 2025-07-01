/**
 * Agent Replication Service - Agent genome marketplace and replication system
 */

import type { Address } from '@solana/addresses';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  createSolanaRpcSubscriptions,
  getSignatureFromTransaction,
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
} from '@solana/web3.js';

// Core interfaces
export interface IReplicationTemplate {
  pubkey: Address;
  sourceAgent: Address;
  creator: Address;
  genomeHash: string;
  baseCapabilities: number[];
  replicationFee: bigint;
  maxReplications: number;
  currentReplications: number;
  isActive: boolean;
  createdAt: number;
}

export interface IReplicationRecord {
  pubkey: Address;
  template: Address;
  sourceAgent: Address;
  replicatedAgent: Address;
  buyer: Address;
  feePaid: bigint;
  customizations: IAgentCustomization;
  replicatedAt: number;
}

export interface IAgentCustomization {
  namePrefix?: string;
  personalityTraits?: string[];
  specializations?: number[];
  appearance?: string;
  voiceSettings?: string;
}

export interface IReplicationConfig {
  commitment?: Commitment;
  maxRetries?: number;
  skipPreflight?: boolean;
}

export interface IReplicationTemplateResult {
  signature: string;
  templatePda: Address;
  sourceAgent: Address;
  genomeHash: string;
  replicationFee: bigint;
  timestamp: Date;
}

export interface IAgentReplicationResult {
  signature: string;
  replicatedAgent: Address;
  replicationRecord: Address;
  template: Address;
  feePaid: bigint;
  customizations: IAgentCustomization;
  timestamp: Date;
}

export class AgentReplicationService {
  constructor(
    private rpc: Rpc<SolanaRpcApi>,
    private programId: Address,
    private commitment: Commitment = 'confirmed'
  ) {}

  /**
   * Create replication template from existing agent
   */
  async createReplicationTemplate(
    creator: KeyPairSigner,
    templateData: {
      sourceAgent: Address;
      genomeHash: string;
      baseCapabilities: number[];
      replicationFee: bigint;
      maxReplications: number;
    },
    config: IReplicationConfig = {}
  ): Promise<IReplicationTemplateResult> {
    const rpcSubscriptions = createSolanaRpcSubscriptions(this.rpc.transport.config.url.replace('http', 'ws'));
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions,
    });

    try {
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      const templatePda = await this.getReplicationTemplatePDA(templateData.sourceAgent);
      const instruction = await this.createReplicationTemplateInstruction(
        creator.address,
        templatePda,
        templateData
      );

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(creator.address, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstruction(instruction, tx)
      );

      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
      
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: config.commitment || this.commitment,
        maxRetries: config.maxRetries || 3,
        skipPreflight: config.skipPreflight || false,
      });

      const signature = getSignatureFromTransaction(signedTransaction);

      return {
        signature,
        templatePda,
        sourceAgent: templateData.sourceAgent,
        genomeHash: templateData.genomeHash,
        replicationFee: templateData.replicationFee,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to create replication template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Replicate agent from template with customizations
   */
  async replicateAgent(
    buyer: KeyPairSigner,
    templatePda: Address,
    customizations: IAgentCustomization = {},
    config: IReplicationConfig = {}
  ): Promise<IAgentReplicationResult> {
    const rpcSubscriptions = createSolanaRpcSubscriptions(this.rpc.transport.config.url.replace('http', 'ws'));
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions,
    });

    try {
      // Get template information first
      const template = await this.getReplicationTemplate(templatePda);
      if (!template) {
        throw new Error('Replication template not found');
      }

      if (!template.isActive) {
        throw new Error('Replication template is not active');
      }

      if (template.currentReplications >= template.maxReplications) {
        throw new Error('Maximum replications reached for this template');
      }

      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      const newAgentPda = await this.getNewAgentPDA(buyer.address);
      const replicationRecordPda = await this.getReplicationRecordPDA(templatePda, buyer.address);

      const instruction = await this.createReplicateAgentInstruction(
        buyer.address,
        templatePda,
        newAgentPda,
        replicationRecordPda,
        customizations
      );

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(buyer.address, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstruction(instruction, tx)
      );

      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
      
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: config.commitment || this.commitment,
        maxRetries: config.maxRetries || 3,
        skipPreflight: config.skipPreflight || false,
      });

      const signature = getSignatureFromTransaction(signedTransaction);

      return {
        signature,
        replicatedAgent: newAgentPda,
        replicationRecord: replicationRecordPda,
        template: templatePda,
        feePaid: template.replicationFee,
        customizations,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to replicate agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get available replication templates
   */
  async getAvailableTemplates(limit: number = 20): Promise<IReplicationTemplate[]> {
    try {
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: [
          { dataSize: 300 }, // Approximate template size
          {
            memcmp: {
              offset: 8, // After discriminator
              bytes: getBytesEncoder().encode(new Uint8Array([1])), // isActive = true
            },
          },
        ],
        encoding: 'base64',
      }).send();

      const templates: IReplicationTemplate[] = [];
      
      for (const account of accounts.value.slice(0, limit)) {
        try {
          const templateData = this.parseReplicationTemplate(account.pubkey, account.account);
          if (templateData.isActive && templateData.currentReplications < templateData.maxReplications) {
            templates.push(templateData);
          }
        } catch (error) {
          console.warn('Failed to parse replication template:', error);
        }
      }

      // Sort by replication fee (ascending)
      return templates.sort((a, b) => Number(a.replicationFee - b.replicationFee));
    } catch (error) {
      throw new Error(
        `Failed to get available templates: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get replication template by PDA
   */
  async getReplicationTemplate(templatePda: Address): Promise<IReplicationTemplate | null> {
    try {
      const account = await this.rpc.getAccountInfo(templatePda, {
        commitment: this.commitment,
        encoding: 'base64',
      }).send();

      if (!account.value) {
        return null;
      }

      return this.parseReplicationTemplate(templatePda, account.value);
    } catch (error) {
      console.error('Failed to get replication template:', error);
      return null;
    }
  }

  /**
   * Get replication history for an agent
   */
  async getReplicationHistory(agentAddress: Address): Promise<IReplicationRecord[]> {
    try {
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: [
          { dataSize: 200 }, // Approximate replication record size
          {
            memcmp: {
              offset: 8 + 32, // After discriminator and template
              bytes: getAddressEncoder().encode(agentAddress),
            },
          },
        ],
        encoding: 'base64',
      }).send();

      const records: IReplicationRecord[] = [];
      
      for (const account of accounts.value) {
        try {
          const recordData = this.parseReplicationRecord(account.pubkey, account.account);
          records.push(recordData);
        } catch (error) {
          console.warn('Failed to parse replication record:', error);
        }
      }

      // Sort by replication date (newest first)
      return records.sort((a, b) => b.replicatedAt - a.replicatedAt);
    } catch (error) {
      throw new Error(
        `Failed to get replication history: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get templates created by a specific creator
   */
  async getTemplatesByCreator(creator: Address): Promise<IReplicationTemplate[]> {
    try {
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: [
          { dataSize: 300 },
          {
            memcmp: {
              offset: 8 + 32 + 32, // After discriminator, sourceAgent, and creator position
              bytes: getAddressEncoder().encode(creator),
            },
          },
        ],
        encoding: 'base64',
      }).send();

      const templates: IReplicationTemplate[] = [];
      
      for (const account of accounts.value) {
        try {
          const templateData = this.parseReplicationTemplate(account.pubkey, account.account);
          templates.push(templateData);
        } catch (error) {
          console.warn('Failed to parse replication template:', error);
        }
      }

      return templates.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(
        `Failed to get templates by creator: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Calculate replication cost including fees
   */
  calculateReplicationCost(template: IReplicationTemplate, customizations: IAgentCustomization): bigint {
    let totalCost = template.replicationFee;
    
    // Add customization fees
    if (customizations.personalityTraits && customizations.personalityTraits.length > 0) {
      totalCost += BigInt(customizations.personalityTraits.length * 10000); // 0.01 SOL per trait
    }
    
    if (customizations.specializations && customizations.specializations.length > 0) {
      totalCost += BigInt(customizations.specializations.length * 50000); // 0.05 SOL per specialization
    }
    
    if (customizations.appearance) {
      totalCost += BigInt(25000); // 0.025 SOL for custom appearance
    }
    
    if (customizations.voiceSettings) {
      totalCost += BigInt(30000); // 0.03 SOL for voice customization
    }
    
    return totalCost;
  }

  // PDA calculation methods
  private async getReplicationTemplatePDA(sourceAgent: Address): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([116, 101, 109, 112, 108, 97, 116, 101])), // "template"
        getAddressEncoder().encode(sourceAgent),
      ],
    });
    return pda;
  }

  private async getNewAgentPDA(buyer: Address): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // "agent"
        getAddressEncoder().encode(buyer),
      ],
    });
    return pda;
  }

  private async getReplicationRecordPDA(template: Address, buyer: Address): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([114, 101, 112, 108, 105, 99, 97])), // "replica"
        getAddressEncoder().encode(template),
        getAddressEncoder().encode(buyer),
      ],
    });
    return pda;
  }

  // Instruction creation methods (mocked for now)
  private async createReplicationTemplateInstruction(
    creator: Address,
    templatePda: Address,
    data: any
  ): Promise<any> {
    const discriminator = [0x50, 0x60, 0x70, 0x80, 0x90, 0xa0, 0xb0, 0xc0];
    return {
      programId: this.programId,
      accounts: [
        { pubkey: templatePda, isSigner: false, isWritable: true },
        { pubkey: creator, isSigner: true, isWritable: true },
        { pubkey: data.sourceAgent, isSigner: false, isWritable: false },
      ],
      data: new Uint8Array(discriminator),
    };
  }

  private async createReplicateAgentInstruction(
    buyer: Address,
    template: Address,
    newAgent: Address,
    replicationRecord: Address,
    customizations: IAgentCustomization
  ): Promise<any> {
    const discriminator = [0x55, 0x65, 0x75, 0x85, 0x95, 0xa5, 0xb5, 0xc5];
    return {
      programId: this.programId,
      accounts: [
        { pubkey: template, isSigner: false, isWritable: true },
        { pubkey: newAgent, isSigner: false, isWritable: true },
        { pubkey: replicationRecord, isSigner: false, isWritable: true },
        { pubkey: buyer, isSigner: true, isWritable: true },
      ],
      data: new Uint8Array(discriminator),
    };
  }

  // Account parsing methods (mocked for now)
  private parseReplicationTemplate(pubkey: Address, account: any): IReplicationTemplate {
    return {
      pubkey,
      sourceAgent: 'mock_source_agent' as Address,
      creator: 'mock_creator' as Address,
      genomeHash: 'mock_genome_hash_12345',
      baseCapabilities: [1, 2, 4, 8],
      replicationFee: 1000000n, // 0.001 SOL
      maxReplications: 100,
      currentReplications: 5,
      isActive: true,
      createdAt: Date.now(),
    };
  }

  private parseReplicationRecord(pubkey: Address, account: any): IReplicationRecord {
    return {
      pubkey,
      template: 'mock_template' as Address,
      sourceAgent: 'mock_source' as Address,
      replicatedAgent: 'mock_replicated' as Address,
      buyer: 'mock_buyer' as Address,
      feePaid: 1000000n,
      customizations: {
        namePrefix: 'Custom',
        personalityTraits: ['friendly', 'efficient'],
      },
      replicatedAt: Date.now(),
    };
  }
} 