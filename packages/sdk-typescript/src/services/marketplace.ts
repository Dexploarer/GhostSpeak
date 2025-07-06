/**
 * Modern Marketplace Service for Web3.js v2 (2025)
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';

// Import real instruction builders
import { 
  getCreateServiceListingInstructionAsync,
  type ServiceListingDataArgs 
} from '../generated-v2/instructions/createServiceListing';
import { 
  getPurchaseServiceInstructionAsync,
  type ServicePurchaseDataArgs 
} from '../generated-v2/instructions/purchaseService';
import { 
  getCreateJobPostingInstructionAsync,
  type JobPostingDataArgs 
} from '../generated-v2/instructions/createJobPosting';
import { sendAndConfirmTransactionFactory } from '../utils/transaction-sender';

/**
 * Marketplace listing
 */
export interface IMarketplaceListing {
  id: Address;
  seller: Address;
  agentId: Address;
  price: bigint;
  status: 'active' | 'sold' | 'cancelled';
  listedAt: number;
}

/**
 * Sale transaction
 */
export interface ISaleTransaction {
  listingId: Address;
  buyer: Address;
  seller: Address;
  price: bigint;
  timestamp: number;
  signature: string;
}

/**
 * Modern Marketplace Service
 */
export class MarketplaceService {
  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly _programId: Address,
    private readonly commitment: Commitment = 'confirmed'
  ) {}

  /**
   * Create a service listing using real instruction builder
   */
  async createServiceListing(
    creator: KeyPairSigner,
    serviceListing: Address,
    agent: Address,
    listingData: ServiceListingDataArgs
  ): Promise<{
    listingId: Address;
    signature: string;
  }> {
    try {
      console.log(`🏪 Creating service listing: ${listingData.title}`);

      // Use real createServiceListing instruction
      const instruction = await getCreateServiceListingInstructionAsync({
        serviceListing,
        agent,
        creator: creator.address,
        listingData,
      });

      const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc: this.rpc });
      const signature = await sendAndConfirmTransaction([instruction], {
        signers: [creator],
      });

      return { 
        listingId: serviceListing, 
        signature 
      };
    } catch (error) {
      throw new Error(`Service listing creation failed: ${String(error)}`);
    }
  }

  /**
   * Purchase a service using real instruction builder
   */
  async purchaseService(
    buyer: KeyPairSigner,
    servicePurchase: Address,
    serviceListing: Address,
    purchaseData: ServicePurchaseDataArgs
  ): Promise<string> {
    try {
      console.log(`💰 Purchasing service for listing: ${serviceListing}`);

      // Use real purchaseService instruction
      const instruction = await getPurchaseServiceInstructionAsync({
        servicePurchase,
        serviceListing,
        buyer: buyer.address,
        purchaseData,
      });

      const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc: this.rpc });
      const signature = await sendAndConfirmTransaction([instruction], {
        signers: [buyer],
      });

      return signature;
    } catch (error) {
      throw new Error(`Service purchase failed: ${String(error)}`);
    }
  }

  /**
   * Create a job posting using real instruction builder
   */
  async createJobPosting(
    employer: KeyPairSigner,
    jobPosting: Address,
    jobData: JobPostingDataArgs
  ): Promise<{
    jobId: Address;
    signature: string;
  }> {
    try {
      console.log(`📋 Creating job posting: ${jobData.title}`);

      // Use real createJobPosting instruction
      const instruction = await getCreateJobPostingInstructionAsync({
        jobPosting,
        employer: employer.address,
        jobData,
      });

      const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc: this.rpc });
      const signature = await sendAndConfirmTransaction([instruction], {
        signers: [employer],
      });

      return { 
        jobId: jobPosting, 
        signature 
      };
    } catch (error) {
      throw new Error(`Job posting creation failed: ${String(error)}`);
    }
  }

  /**
   * List an agent for sale (legacy method for compatibility)
   */
  async listAgent(
    seller: KeyPairSigner,
    agentId: Address,
    price: bigint
  ): Promise<{
    listingId: Address;
    signature: string;
  }> {
    try {
      console.log(`🏪 Listing agent for ${price} tokens`);

      // Create service listing for the agent
      const serviceListing = `listing_${Date.now()}` as Address;
      const listingData: ServiceListingDataArgs = {
        title: `Agent ${agentId}`,
        description: 'AI Agent for sale',
        price,
        tokenMint: '11111111111111111111111111111111' as Address, // SOL
        serviceType: 'agent',
        paymentToken: '11111111111111111111111111111111' as Address, // SOL
        estimatedDelivery: BigInt(0), // Immediate
        tags: ['agent', 'ai'],
      };

      return await this.createServiceListing(seller, serviceListing, agentId, listingData);
    } catch (error) {
      throw new Error(`Agent listing failed: ${String(error)}`);
    }
  }

  /**
   * Purchase an agent from marketplace (legacy method for compatibility)
   */
  async purchaseAgent(
    buyer: KeyPairSigner,
    listingId: Address
  ): Promise<string> {
    try {
      console.log(`💰 Purchasing agent`);

      const servicePurchase = `purchase_${Date.now()}` as Address;
      const purchaseData: ServicePurchaseDataArgs = {
        listingId: BigInt(1),
        quantity: 1,
        requirements: [],
        customInstructions: 'Agent purchase',
        deadline: BigInt(Date.now() + 86400000), // 1 day
      };

      return await this.purchaseService(buyer, servicePurchase, listingId, purchaseData);
    } catch (error) {
      throw new Error(`Agent purchase failed: ${String(error)}`);
    }
  }

  /**
   * Cancel a listing (placeholder - instruction not implemented yet)
   */
  async cancelListing(
    _seller: KeyPairSigner,
    _listingId: Address
  ): Promise<string> {
    try {
      console.log('❌ Cancelling marketplace listing');

      // TODO: Implement real cancelListing instruction when available
      await new Promise(resolve => setTimeout(resolve, 800));

      return `sig_cancel_${Date.now()}`;
    } catch (error) {
      throw new Error(`Listing cancellation failed: ${String(error)}`);
    }
  }

  /**
   * Get marketplace listing
   */
  async getListing(listingId: Address): Promise<IMarketplaceListing | null> {
    try {
      const accountInfo = await this.rpc
        .getAccountInfo(listingId, {
          commitment: this.commitment,
          encoding: 'base64',
        })
        .send();

      if (!accountInfo.value) {
        return null;
      }

      // TODO: Parse account data using ListingAccount parser when available
      return {
        id: listingId,
        seller: `seller_${Date.now()}` as Address,
        agentId: `agent_${Date.now()}` as Address,
        price: BigInt(500000000),
        status: 'active',
        listedAt: Date.now() - 3600000,
      };
    } catch (error) {
      console.error('Failed to get listing:', error);
      return null;
    }
  }

  /**
   * Get all active listings
   */
  async getActiveListings(_limit: number = 50): Promise<IMarketplaceListing[]> {
    try {
      console.log('📝 Getting active marketplace listings');

      // TODO: Implement real listing account enumeration
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock listings for now
      return [
        {
          id: `listing_1` as Address,
          seller: `seller_1` as Address,
          agentId: `agent_1` as Address,
          price: BigInt(1000000000),
          status: 'active',
          listedAt: Date.now() - 7200000,
        },
        {
          id: `listing_2` as Address,
          seller: `seller_2` as Address,
          agentId: `agent_2` as Address,
          price: BigInt(2000000000),
          status: 'active',
          listedAt: Date.now() - 3600000,
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get active listings: ${String(error)}`);
    }
  }

  /**
   * Get sales history
   */
  async getSalesHistory(_limit: number = 50): Promise<ISaleTransaction[]> {
    try {
      console.log('📊 Getting marketplace sales history');

      // TODO: Implement real sales history from transaction logs
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock sales history for now
      return [
        {
          listingId: `listing_sold_1` as Address,
          buyer: `buyer_1` as Address,
          seller: `seller_1` as Address,
          price: BigInt(1500000000),
          timestamp: Date.now() - 86400000, // 1 day ago
          signature: `sig_sale_1`,
        },
        {
          listingId: `listing_sold_2` as Address,
          buyer: `buyer_2` as Address,
          seller: `seller_2` as Address,
          price: BigInt(800000000),
          timestamp: Date.now() - 172800000, // 2 days ago
          signature: `sig_sale_2`,
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get sales history: ${String(error)}`);
    }
  }

  /**
   * Get sales statistics
   */
  async getSalesStats(): Promise<{
    totalSales: number;
    totalVolume: bigint;
    averagePrice: bigint;
  }> {
    try {
      console.log('📈 Getting marketplace statistics');

      const salesHistory = await this.getSalesHistory(1000);

      const totalSales = salesHistory.length;
      const totalVolume = salesHistory.reduce((sum, sale) => sum + sale.price, BigInt(0));
      const averagePrice = totalSales > 0 ? totalVolume / BigInt(totalSales) : BigInt(0);

      return {
        totalSales,
        totalVolume,
        averagePrice,
      };
    } catch (error) {
      throw new Error(`Failed to get sales statistics: ${String(error)}`);
    }
  }
} 
