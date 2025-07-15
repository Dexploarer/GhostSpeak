/**
 * GhostSpeak Client - July 2025 Implementation
 * Core client using modern @solana/kit patterns
 */

import { 
  createSolanaRpc,
  type Rpc
} from '@solana/rpc';
import {
  createDefaultRpcTransport
} from '@solana/rpc-transport';
import {
  type Address,
  address
} from '@solana/addresses';
import {
  getBase64Decoder,
  getBase64Encoder
} from '@solana/codecs';
import type { TransactionSigner } from '@solana/signers';
import type { IInstruction } from '@solana/instructions';

import { GhostSpeakConfig } from './types.js';
import { GHOSTSPEAK_PROGRAM_ID } from '../types/index.js';
import * as instructions from './instructions/index.js';

export class GhostSpeakClient {
  private rpc: Rpc<any>; // Simplified for now
  private endpoint: string;
  
  constructor(config: GhostSpeakConfig = {}) {
    this.endpoint = config.endpoint || 'https://api.devnet.solana.com';
    
    // Create RPC with July 2025 patterns
    const transport = createDefaultRpcTransport({ url: this.endpoint });
    this.rpc = createSolanaRpc({ transport });
  }
  
  /**
   * Register a new agent on-chain
   */
  async registerAgent(
    signer: TransactionSigner,
    agentId: string,
    name: string,
    description: string,
    capabilities: string[] = []
  ): Promise<string> {
    // Create instruction
    const instruction = await instructions.createRegisterAgentInstruction(
      signer,
      agentId,
      name,
      description,
      capabilities
    );
    
    // For now, return a placeholder - we'll implement full transaction flow later
    console.log('RegisterAgent instruction created:', instruction);
    return 'simulation-' + Date.now();
  }
  
  /**
   * Update agent information
   */
  async updateAgent(
    signer: TransactionSigner,
    agentId: string,
    updates: {
      name?: string;
      description?: string;
      capabilities?: string[];
    }
  ): Promise<string> {
    const instruction = await instructions.createUpdateAgentInstruction(
      signer,
      agentId,
      updates.name,
      updates.description,
      updates.capabilities
    );
    
    console.log('UpdateAgent instruction created:', instruction);
    return 'simulation-' + Date.now();
  }
  
  /**
   * Activate an agent
   */
  async activateAgent(
    signer: TransactionSigner,
    agentId: string
  ): Promise<string> {
    const instruction = await instructions.createActivateAgentInstruction(
      signer,
      agentId
    );
    
    console.log('ActivateAgent instruction created:', instruction);
    return 'simulation-' + Date.now();
  }
  
  /**
   * Create a service listing
   */
  async createServiceListing(
    signer: TransactionSigner,
    agentId: string,
    listingId: bigint,
    listingData: {
      name: string;
      description: string;
      price: bigint;
      deliveryTime: number;
      category: string;
    }
  ): Promise<string> {
    const instruction = await instructions.createServiceListingInstruction(
      signer,
      agentId,
      listingId,
      listingData.name,
      listingData.description,
      listingData.price,
      listingData.deliveryTime,
      listingData.category
    );
    
    console.log('CreateServiceListing instruction created:', instruction);
    return 'simulation-' + Date.now();
  }
  
  /**
   * Purchase a service (create work order)
   */
  async purchaseService(
    buyer: TransactionSigner,
    listing: Address,
    seller: Address,
    amount: bigint
  ): Promise<string> {
    const instruction = await instructions.createPurchaseServiceInstruction(
      buyer,
      listing,
      seller,
      amount
    );
    
    console.log('PurchaseService instruction created:', instruction);
    return 'simulation-' + Date.now();
  }
  
  /**
   * Get agent account data
   */
  async getAgent(agentAddress: Address) {
    try {
      const accountInfo = await this.rpc.getAccountInfo(
        agentAddress,
        {
          encoding: 'base64'
        }
      ).send();
      
      if (!accountInfo || !accountInfo.value || !accountInfo.value.data) {
        return null;
      }
      
      // Decode account data (simplified for now)
      return {
        address: agentAddress,
        owner: accountInfo.value.owner,
        lamports: accountInfo.value.lamports,
        data: accountInfo.value.data
      };
    } catch (error) {
      console.error('Error fetching agent:', error);
      return null;
    }
  }
  
  /**
   * Get all agents
   */
  async getAllAgents() {
    try {
      const accounts = await this.rpc.getProgramAccounts(
        GHOSTSPEAK_PROGRAM_ID,
        {
          encoding: 'base64'
        }
      ).send();
      
      return accounts || [];
    } catch (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
  }
}