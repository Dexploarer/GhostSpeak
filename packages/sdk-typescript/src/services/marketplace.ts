/**
 * Marketplace Service - Human-AI interactions and agent commerce
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
export interface IServiceListing {
  pubkey: Address;
  agent: Address;
  owner: Address;
  title: string;
  description: string;
  serviceType: number;
  price: bigint;
  isActive: boolean;
  totalOrders: number;
  rating: number;
}

export interface IJobPosting {
  pubkey: Address;
  employer: Address;
  title: string;
  description: string;
  budgetMin: bigint;
  budgetMax: bigint;
  isActive: boolean;
  applicationsCount: number;
}

export interface IMarketplaceConfig {
  commitment?: Commitment;
  maxRetries?: number;
  skipPreflight?: boolean;
}

export class MarketplaceService {
  constructor(
    private rpc: Rpc<SolanaRpcApi>,
    private programId: Address,
    private commitment: Commitment = 'confirmed'
  ) {}

  /**
   * Create service listing for humans to purchase
   */
  async createServiceListing(
    owner: KeyPairSigner,
    listingData: {
      title: string;
      description: string;
      serviceType: number;
      price: bigint;
    },
    config: IMarketplaceConfig = {}
  ): Promise<{ signature: string; listingPda: Address }> {
    const rpcSubscriptions = createSolanaRpcSubscriptions(this.rpc.transport.config.url.replace('http', 'ws'));
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions,
    });

    try {
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      const listingPda = await this.getServiceListingPDA(owner.address, listingData.title);
      const instruction = await this.createServiceListingInstruction(owner.address, listingPda, listingData);

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(owner.address, tx),
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
      return { signature, listingPda };
    } catch (error) {
      throw new Error(`Failed to create service listing: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Purchase service from agent
   */
  async purchaseService(
    customer: KeyPairSigner,
    listingPda: Address,
    requirements: string,
    config: IMarketplaceConfig = {}
  ): Promise<{ signature: string; purchasePda: Address }> {
    const rpcSubscriptions = createSolanaRpcSubscriptions(this.rpc.transport.config.url.replace('http', 'ws'));
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions,
    });

    try {
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      const purchasePda = await this.getServicePurchasePDA(customer.address, listingPda);
      const instruction = await this.createPurchaseServiceInstruction(customer.address, listingPda, purchasePda, requirements);

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(customer.address, tx),
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
      return { signature, purchasePda };
    } catch (error) {
      throw new Error(`Failed to purchase service: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create job posting for agents to apply
   */
  async createJobPosting(
    employer: KeyPairSigner,
    jobData: {
      title: string;
      description: string;
      budgetMin: bigint;
      budgetMax: bigint;
    },
    config: IMarketplaceConfig = {}
  ): Promise<{ signature: string; jobPda: Address }> {
    const rpcSubscriptions = createSolanaRpcSubscriptions(this.rpc.transport.config.url.replace('http', 'ws'));
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions,
    });

    try {
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      const jobPda = await this.getJobPostingPDA(employer.address, jobData.title);
      const instruction = await this.createJobPostingInstruction(employer.address, jobPda, jobData);

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(employer.address, tx),
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
      return { signature, jobPda };
    } catch (error) {
      throw new Error(`Failed to create job posting: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Agent applies to job
   */
  async applyToJob(
    agent: KeyPairSigner,
    jobPda: Address,
    applicationData: {
      coverLetter: string;
      proposedRate: bigint;
    },
    config: IMarketplaceConfig = {}
  ): Promise<{ signature: string; applicationPda: Address }> {
    const rpcSubscriptions = createSolanaRpcSubscriptions(this.rpc.transport.config.url.replace('http', 'ws'));
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions,
    });

    try {
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      const applicationPda = await this.getJobApplicationPDA(jobPda, agent.address);
      const instruction = await this.createJobApplicationInstruction(agent.address, jobPda, applicationPda, applicationData);

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(agent.address, tx),
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
      return { signature, applicationPda };
    } catch (error) {
      throw new Error(`Failed to apply to job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List active service listings
   */
  async getActiveServiceListings(limit: number = 20): Promise<IServiceListing[]> {
    try {
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: [{ dataSize: 200 }], // Approximate service listing size
        encoding: 'base64',
      }).send();

      const listings: IServiceListing[] = [];
      for (const account of accounts.value.slice(0, limit)) {
        try {
          const listingData = this.parseServiceListing(account.pubkey, account.account);
          if (listingData.isActive) {
            listings.push(listingData);
          }
        } catch (error) {
          console.warn('Failed to parse service listing:', error);
        }
      }

      return listings.sort((a, b) => b.rating - a.rating);
    } catch (error) {
      throw new Error(`Failed to get service listings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List active job postings
   */
  async getActiveJobPostings(limit: number = 20): Promise<IJobPosting[]> {
    try {
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: [{ dataSize: 180 }], // Approximate job posting size
        encoding: 'base64',
      }).send();

      const jobs: IJobPosting[] = [];
      for (const account of accounts.value.slice(0, limit)) {
        try {
          const jobData = this.parseJobPosting(account.pubkey, account.account);
          if (jobData.isActive) {
            jobs.push(jobData);
          }
        } catch (error) {
          console.warn('Failed to parse job posting:', error);
        }
      }

      return jobs;
    } catch (error) {
      throw new Error(`Failed to get job postings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // PDA calculation methods
  private async getServiceListingPDA(owner: Address, title: string): Promise<Address> {
    const titleHash = new TextEncoder().encode(title).slice(0, 32);
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([115, 101, 114, 118, 105, 99, 101])), // "service"
        getAddressEncoder().encode(owner),
        getBytesEncoder().encode(titleHash),
      ],
    });
    return pda;
  }

  private async getServicePurchasePDA(customer: Address, listing: Address): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([112, 117, 114, 99, 104, 97, 115, 101])), // "purchase"
        getAddressEncoder().encode(customer),
        getAddressEncoder().encode(listing),
      ],
    });
    return pda;
  }

  private async getJobPostingPDA(employer: Address, title: string): Promise<Address> {
    const titleHash = new TextEncoder().encode(title).slice(0, 32);
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([106, 111, 98])), // "job"
        getAddressEncoder().encode(employer),
        getBytesEncoder().encode(titleHash),
      ],
    });
    return pda;
  }

  private async getJobApplicationPDA(job: Address, agent: Address): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([97, 112, 112, 108, 121])), // "apply"
        getAddressEncoder().encode(job),
        getAddressEncoder().encode(agent),
      ],
    });
    return pda;
  }

  // Instruction creation methods (mocked for now)
  private async createServiceListingInstruction(owner: Address, listingPda: Address, data: any): Promise<any> {
    const discriminator = [0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90];
    return {
      programId: this.programId,
      accounts: [
        { pubkey: listingPda, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
      ],
      data: new Uint8Array(discriminator),
    };
  }

  private async createPurchaseServiceInstruction(customer: Address, listing: Address, purchase: Address, requirements: string): Promise<any> {
    const discriminator = [0x25, 0x35, 0x45, 0x55, 0x65, 0x75, 0x85, 0x95];
    return {
      programId: this.programId,
      accounts: [
        { pubkey: purchase, isSigner: false, isWritable: true },
        { pubkey: customer, isSigner: true, isWritable: true },
        { pubkey: listing, isSigner: false, isWritable: false },
      ],
      data: new Uint8Array(discriminator),
    };
  }

  private async createJobPostingInstruction(employer: Address, jobPda: Address, data: any): Promise<any> {
    const discriminator = [0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90, 0xa0];
    return {
      programId: this.programId,
      accounts: [
        { pubkey: jobPda, isSigner: false, isWritable: true },
        { pubkey: employer, isSigner: true, isWritable: true },
      ],
      data: new Uint8Array(discriminator),
    };
  }

  private async createJobApplicationInstruction(agent: Address, job: Address, application: Address, data: any): Promise<any> {
    const discriminator = [0x35, 0x45, 0x55, 0x65, 0x75, 0x85, 0x95, 0xa5];
    return {
      programId: this.programId,
      accounts: [
        { pubkey: application, isSigner: false, isWritable: true },
        { pubkey: agent, isSigner: true, isWritable: true },
        { pubkey: job, isSigner: false, isWritable: true },
      ],
      data: new Uint8Array(discriminator),
    };
  }

  // Account parsing methods (mocked for now)
  private parseServiceListing(pubkey: Address, account: any): IServiceListing {
    return {
      pubkey,
      agent: 'mock_agent' as Address,
      owner: 'mock_owner' as Address,
      title: 'Mock Service',
      description: 'Mock Description',
      serviceType: 1,
      price: 1000000n,
      isActive: true,
      totalOrders: 0,
      rating: 5.0,
    };
  }

  private parseJobPosting(pubkey: Address, account: any): IJobPosting {
    return {
      pubkey,
      employer: 'mock_employer' as Address,
      title: 'Mock Job',
      description: 'Mock Job Description',
      budgetMin: 500000n,
      budgetMax: 2000000n,
      isActive: true,
      applicationsCount: 0,
    };
  }
} 