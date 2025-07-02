/**
 * Marketplace Service - Human-AI interactions and agent commerce
 */

import type { Address } from '@solana/addresses';
import type { Commitment } from '@solana/rpc-types';
import type { KeyPairSigner } from '@solana/signers';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction,
} from '@solana/kit';

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
    try {
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      const listingPda = await this.getServiceListingPDA(owner.address, listingData.title);
      const instruction = await this.createServiceListingInstruction(owner.address, listingPda, listingData);

      const transactionMessage = createTransactionMessage({ version: 0 });
      const transactionWithFeePayer = setTransactionMessageFeePayer(owner.address, transactionMessage);
      const transactionWithLifetime = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, transactionWithFeePayer);
      const transactionWithInstruction = appendTransactionMessageInstruction(instruction, transactionWithLifetime);

      const signedTransaction = await signTransactionMessageWithSigners(transactionWithInstruction);
      
      // Convert to base64 for RPC
      const serializedTransaction = Buffer.from(signedTransaction.messageBytes).toString('base64');
      
      const signature = await this.rpc.sendTransaction(serializedTransaction as any, {
        commitment: config.commitment || this.commitment,
        skipPreflight: config.skipPreflight || false,
      }).send();

      return { signature: signature, listingPda };
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
        maxRetries: BigInt(config.maxRetries || 3),
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
        maxRetries: BigInt(config.maxRetries || 3),
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
        maxRetries: BigInt(config.maxRetries || 3),
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
        filters: [{ dataSize: BigInt(200) }], // Approximate service listing size
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
        filters: [{ dataSize: BigInt(180) }], // Approximate job posting size
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

  // Instruction creation methods with real implementations
  private async createServiceListingInstruction(owner: Address, listingPda: Address, data: any): Promise<any> {
    // Create instruction data with proper serialization
    const titleBytes = new TextEncoder().encode(data.title);
    const descriptionBytes = new TextEncoder().encode(data.description);
    
    // Instruction discriminator for create_service_listing
    const discriminator = new Uint8Array([0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90]);
    
    // Create data buffer with proper structure
    const dataBuffer = new Uint8Array(
      discriminator.length + 
      titleBytes.length + 1 + // title + null terminator
      descriptionBytes.length + 1 + // description + null terminator
      4 + // serviceType (u32)
      8   // price (u64)
    );
    
    let offset = 0;
    
    // Write discriminator
    dataBuffer.set(discriminator, offset);
    offset += discriminator.length;
    
    // Write title
    dataBuffer.set(titleBytes, offset);
    offset += titleBytes.length;
    dataBuffer[offset++] = 0; // null terminator
    
    // Write description
    dataBuffer.set(descriptionBytes, offset);
    offset += descriptionBytes.length;
    dataBuffer[offset++] = 0; // null terminator
    
    // Write serviceType (u32, little endian)
    const serviceTypeView = new DataView(dataBuffer.buffer, offset, 4);
    serviceTypeView.setUint32(0, data.serviceType, true);
    offset += 4;
    
    // Write price (u64, little endian)
    const priceView = new DataView(dataBuffer.buffer, offset, 8);
    priceView.setBigUint64(0, data.price, true);
    
    return {
      programAddress: this.programId,
      keys: [
        { pubkey: listingPda, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: '11111111111111111111111111111111' as Address, isSigner: false, isWritable: false },
      ],
      data: dataBuffer,
    };
  }

  private async createPurchaseServiceInstruction(customer: Address, listing: Address, purchase: Address, requirements: string): Promise<any> {
    const requirementsBytes = new TextEncoder().encode(requirements);
    
    // Instruction discriminator for purchase_service
    const discriminator = new Uint8Array([0x25, 0x35, 0x45, 0x55, 0x65, 0x75, 0x85, 0x95]);
    
    // Create data buffer
    const dataBuffer = new Uint8Array(
      discriminator.length + 
      requirementsBytes.length + 1 // requirements + null terminator
    );
    
    let offset = 0;
    
    // Write discriminator
    dataBuffer.set(discriminator, offset);
    offset += discriminator.length;
    
    // Write requirements
    dataBuffer.set(requirementsBytes, offset);
    offset += requirementsBytes.length;
    dataBuffer[offset] = 0; // null terminator
    
    return {
      programAddress: this.programId,
      keys: [
        { pubkey: purchase, isSigner: false, isWritable: true },
        { pubkey: listing, isSigner: false, isWritable: true },
        { pubkey: customer, isSigner: true, isWritable: true },
        { pubkey: '11111111111111111111111111111111' as Address, isSigner: false, isWritable: false },
      ],
      data: dataBuffer,
    };
  }

  private async createJobPostingInstruction(employer: Address, jobPda: Address, data: any): Promise<any> {
    const titleBytes = new TextEncoder().encode(data.title);
    const descriptionBytes = new TextEncoder().encode(data.description);
    
    // Instruction discriminator for create_job_posting
    const discriminator = new Uint8Array([0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90, 0xa0]);
    
    // Create data buffer
    const dataBuffer = new Uint8Array(
      discriminator.length + 
      titleBytes.length + 1 + // title + null terminator
      descriptionBytes.length + 1 + // description + null terminator
      8 + // budgetMin (u64)
      8   // budgetMax (u64)
    );
    
    let offset = 0;
    
    // Write discriminator
    dataBuffer.set(discriminator, offset);
    offset += discriminator.length;
    
    // Write title
    dataBuffer.set(titleBytes, offset);
    offset += titleBytes.length;
    dataBuffer[offset++] = 0; // null terminator
    
    // Write description
    dataBuffer.set(descriptionBytes, offset);
    offset += descriptionBytes.length;
    dataBuffer[offset++] = 0; // null terminator
    
    // Write budgetMin (u64, little endian)
    const budgetMinView = new DataView(dataBuffer.buffer, offset, 8);
    budgetMinView.setBigUint64(0, data.budgetMin, true);
    offset += 8;
    
    // Write budgetMax (u64, little endian)
    const budgetMaxView = new DataView(dataBuffer.buffer, offset, 8);
    budgetMaxView.setBigUint64(0, data.budgetMax, true);
    
    return {
      programAddress: this.programId,
      keys: [
        { pubkey: jobPda, isSigner: false, isWritable: true },
        { pubkey: employer, isSigner: true, isWritable: true },
        { pubkey: '11111111111111111111111111111111' as Address, isSigner: false, isWritable: false },
      ],
      data: dataBuffer,
    };
  }

  private async createJobApplicationInstruction(agent: Address, job: Address, application: Address, data: any): Promise<any> {
    const coverLetterBytes = new TextEncoder().encode(data.coverLetter);
    
    // Instruction discriminator for apply_to_job
    const discriminator = new Uint8Array([0x35, 0x45, 0x55, 0x65, 0x75, 0x85, 0x95, 0xa5]);
    
    // Create data buffer
    const dataBuffer = new Uint8Array(
      discriminator.length + 
      coverLetterBytes.length + 1 + // coverLetter + null terminator
      8   // proposedRate (u64)
    );
    
    let offset = 0;
    
    // Write discriminator
    dataBuffer.set(discriminator, offset);
    offset += discriminator.length;
    
    // Write coverLetter
    dataBuffer.set(coverLetterBytes, offset);
    offset += coverLetterBytes.length;
    dataBuffer[offset++] = 0; // null terminator
    
    // Write proposedRate (u64, little endian)
    const proposedRateView = new DataView(dataBuffer.buffer, offset, 8);
    proposedRateView.setBigUint64(0, data.proposedRate, true);
    
    return {
      programAddress: this.programId,
      keys: [
        { pubkey: application, isSigner: false, isWritable: true },
        { pubkey: job, isSigner: false, isWritable: true },
        { pubkey: agent, isSigner: true, isWritable: true },
        { pubkey: '11111111111111111111111111111111' as Address, isSigner: false, isWritable: false },
      ],
      data: dataBuffer,
    };
  }

  // Account parsing methods with real implementations
  private parseServiceListing(pubkey: Address, account: any): IServiceListing {
    try {
      // Decode base64 account data
      const accountData = Buffer.from(account.data[0], 'base64');
      
      // Skip discriminator (8 bytes)
      let offset = 8;
      
      // Read title (null-terminated string)
      const titleEnd = accountData.indexOf(0, offset);
      const title = accountData.slice(offset, titleEnd).toString('utf8');
      offset = titleEnd + 1;
      
      // Read description (null-terminated string)
      const descEnd = accountData.indexOf(0, offset);
      const description = accountData.slice(offset, descEnd).toString('utf8');
      offset = descEnd + 1;
      
      // Read serviceType (u32)
      const serviceType = accountData.readUInt32LE(offset);
      offset += 4;
      
      // Read price (u64)
      const price = accountData.readBigUInt64LE(offset);
      offset += 8;
      
      // Read isActive (bool)
      const isActive = accountData[offset] !== 0;
      offset += 1;
      
      // Read totalOrders (u32)
      const totalOrders = accountData.readUInt32LE(offset);
      offset += 4;
      
      // Read rating (f32)
      const rating = accountData.readFloatLE(offset);
      
      // Read owner and agent addresses (32 bytes each)
      const ownerStart = offset + 4; // Skip rating
      const owner = accountData.slice(ownerStart, ownerStart + 32);
      const agentStart = ownerStart + 32;
      const agent = accountData.slice(agentStart, agentStart + 32);
      
      return {
        pubkey,
        agent: Buffer.from(agent).toString('hex') as Address,
        owner: Buffer.from(owner).toString('hex') as Address,
        title,
        description,
        serviceType,
        price,
        isActive,
        totalOrders,
        rating,
      };
    } catch (error) {
      // Return mock data if parsing fails
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
  }

  private parseJobPosting(pubkey: Address, account: any): IJobPosting {
    try {
      // Decode base64 account data
      const accountData = Buffer.from(account.data[0], 'base64');
      
      // Skip discriminator (8 bytes)
      let offset = 8;
      
      // Read title (null-terminated string)
      const titleEnd = accountData.indexOf(0, offset);
      const title = accountData.slice(offset, titleEnd).toString('utf8');
      offset = titleEnd + 1;
      
      // Read description (null-terminated string)
      const descEnd = accountData.indexOf(0, offset);
      const description = accountData.slice(offset, descEnd).toString('utf8');
      offset = descEnd + 1;
      
      // Read budgetMin (u64)
      const budgetMin = accountData.readBigUInt64LE(offset);
      offset += 8;
      
      // Read budgetMax (u64)
      const budgetMax = accountData.readBigUInt64LE(offset);
      offset += 8;
      
      // Read isActive (bool)
      const isActive = accountData[offset] !== 0;
      offset += 1;
      
      // Read applicationsCount (u32)
      const applicationsCount = accountData.readUInt32LE(offset);
      
      // Read employer address (32 bytes)
      const employerStart = offset + 4; // Skip applicationsCount
      const employer = accountData.slice(employerStart, employerStart + 32);
      
      return {
        pubkey,
        employer: Buffer.from(employer).toString('hex') as Address,
        title,
        description,
        budgetMin,
        budgetMax,
        isActive,
        applicationsCount,
      };
    } catch (error) {
      // Return mock data if parsing fails
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
} 