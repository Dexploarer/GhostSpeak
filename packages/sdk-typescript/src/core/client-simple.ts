/**
 * GhostSpeak Simple Client - Minimal working implementation
 */

import type { Address } from '@solana/addresses';
import type { TransactionSigner } from '@solana/signers';
import type { IInstruction } from '@solana/instructions';

import { GhostSpeakConfig, GHOSTSPEAK_PROGRAM_ID } from './types.js';
import * as instructions from './instructions/index.js';

export class GhostSpeakClient {
  private endpoint: string;
  
  constructor(config: GhostSpeakConfig = {}) {
    this.endpoint = config.endpoint || 'https://api.devnet.solana.com';
  }
  
  /**
   * Register a new agent on-chain
   */
  async registerAgent(
    signer: TransactionSigner,
    agentId: string,
    agentType: number,
    metadataUri: string
  ): Promise<IInstruction> {
    return await instructions.createRegisterAgentInstruction(
      signer,
      agentId,
      agentType,
      metadataUri
    );
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
  ): Promise<IInstruction> {
    return await instructions.createUpdateAgentInstruction(
      signer,
      agentId,
      updates.name,
      updates.description,
      updates.capabilities
    );
  }
  
  /**
   * Activate an agent
   */
  async activateAgent(
    signer: TransactionSigner,
    agentId: string
  ): Promise<IInstruction> {
    return await instructions.createActivateAgentInstruction(
      signer,
      agentId
    );
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
  ): Promise<IInstruction> {
    return await instructions.createServiceListingInstruction(
      signer,
      agentId,
      listingId,
      listingData.name,
      listingData.description,
      listingData.price,
      listingData.deliveryTime,
      listingData.category
    );
  }
  
  /**
   * Purchase a service (create work order)
   */
  async purchaseService(
    buyer: TransactionSigner,
    listing: Address,
    seller: Address,
    amount: bigint
  ): Promise<IInstruction> {
    return await instructions.createPurchaseServiceInstruction(
      buyer,
      listing,
      seller,
      amount
    );
  }
  
  // RPC will be handled by the CLI or test scripts for now
}