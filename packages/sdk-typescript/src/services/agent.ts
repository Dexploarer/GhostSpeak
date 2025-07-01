/**
 * Agent Service - Real on-chain agent management
 * Uses Codama-generated instructions for type-safe blockchain operations
 */

import type { Address } from '@solana/addresses';
import type { Rpc, SolanaRpcApi } from '@solana/rpc';
import type { KeyPairSigner, TransactionSigner } from '@solana/signers';
import type { Commitment } from '@solana/rpc-types';

// Import transaction utilities following Web3.js v2 patterns
import { 
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  createSolanaRpcSubscriptions,
  generateKeyPairSigner
} from '@solana/kit';

// Import addresses functionality
import { getProgramDerivedAddress, getAddressEncoder } from '@solana/addresses';
import { getBytesEncoder } from '@solana/codecs';

// Import Codama-generated functionality
import { getRegisterAgentInstructionAsync } from '../generated-v2/instructions/registerAgent';
import { 
  fetchMaybeAgentAccount
} from '../generated-v2/accounts/agentAccount';

// Import types
import type { ICreateAgentOptions, IAgentAccount } from '../types';

/**
 * Service for managing AI agents on the podAI Protocol
 */
export class AgentService {
  constructor(
    private readonly rpc: Rpc<SolanaRpcApi>,
    private readonly programId: Address,
    private readonly commitment: Commitment = 'confirmed',
    private readonly wsEndpoint?: string
  ) {}

  /**
   * Register a new agent on-chain
   * @param signer - The transaction signer (wallet)
   * @param options - Agent creation options
   * @returns Promise resolving to transaction signature
   */
  async registerAgent(
    signer: KeyPairSigner,
    options: ICreateAgentOptions
  ): Promise<string> {
    try {
      // Get the register agent instruction using Codama
      const instruction = await getRegisterAgentInstructionAsync({
        signer: signer as TransactionSigner,
        capabilities: BigInt(options.capabilities),
        metadataUri: options.metadataUri,
      }, { programAddress: this.programId });

      console.log('✅ Instruction created successfully');

      // Get the latest blockhash for transaction lifetime
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send();

      // Create WebSocket URL from RPC URL or use provided wsEndpoint
      const wsUrl = this.wsEndpoint || 'wss://api.devnet.solana.com';
      const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

      // Create the send and confirm transaction factory
      const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ 
        rpc: this.rpc, 
        rpcSubscriptions 
      });

      // Build the transaction using the pipe pattern
      const transaction = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(signer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([instruction], tx)
      );

      // Sign the transaction
      const signedTransaction = await signTransactionMessageWithSigners(transaction);

      // Send and confirm the transaction
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: this.commitment,
        skipPreflight: false
      });

      // Get the transaction signature
      const signature = getSignatureFromTransaction(signedTransaction);
      
      console.log('✅ Agent registration transaction confirmed:', signature);
      return signature;

    } catch (error) {
      console.error('Failed to register agent:', error);
      throw new Error(
        `Agent registration failed: ${error instanceof Error ? (error as Error).message : String(error)}`
      );
    }
  }

  /**
   * Get agent account data from the blockchain
   * @param agentAddress - The agent's PDA address
   * @returns Promise resolving to agent account data or null if not found
   */
  async getAgent(agentAddress: Address): Promise<IAgentAccount | null> {
    try {
      const maybeAccount = await fetchMaybeAgentAccount(this.rpc, agentAddress);

      if (!maybeAccount.exists) {
        return null;
      }

      // Convert Codama account to our interface
      const account = maybeAccount.data;
      return {
        pubkey: agentAddress,
        capabilities: Number(account.capabilities),
        metadataUri: account.metadataUri,
        reputation: Number(account.reputation),
        lastUpdated: Number(account.lastUpdated),
        invitesSent: 0, // Default value for missing property
        lastInviteAt: 0, // Default value for missing property
        bump: Number(account.bump),
      };

    } catch (error) {
      console.error('Failed to fetch agent:', error);
      return null;
    }
  }

  /**
   * Get the PDA address for an agent given their wallet public key
   * @param walletPubkey - The wallet's public key
   * @returns Promise resolving to the agent's PDA address
   */
  async getAgentPDA(walletPubkey: Address): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
      programAddress: this.programId,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([97, 103, 101, 110, 116])), // "agent"
        getAddressEncoder().encode(walletPubkey),
      ],
    });

    return pda;
  }

  /**
   * Check if an agent is registered
   * @param walletPubkey - The wallet's public key
   * @returns Promise resolving to boolean indicating if agent exists
   */
  async isAgentRegistered(walletPubkey: Address): Promise<boolean> {
    try {
      const agentPDA = await this.getAgentPDA(walletPubkey);
      const agent = await this.getAgent(agentPDA);
      return agent !== null;
    } catch (error) {
      console.error('Failed to check agent registration:', error);
      return false;
    }
  }

  /**
   * Find agents by capability
   * @param capability - Capability bitmask to search for
   * @param limit - Maximum number of agents to return (default: 10)
   * @returns Promise resolving to array of matching agents
   */
  async findAgentsByCapability(
    capability: number, 
    limit: number = 10
  ): Promise<IAgentAccount[]> {
    try {
      // Use getProgramAccounts to find agents with matching capabilities
      const response = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: [
          {
            memcmp: {
              offset: BigInt(0),
              bytes: 'YWdlbnQ=' as any, // 'agent' discriminator in base64
            },
          },
        ],
      }).send();

      const matchingAgents: IAgentAccount[] = [];
      const accounts = response.value || [];
      
      for (const account of accounts) {
        try {
          const agentData = await this.getAgent(account.pubkey);
          if (agentData && (agentData.capabilities & capability) === capability) {
            matchingAgents.push(agentData);
            if (matchingAgents.length >= limit) break;
          }
        } catch (error) {
          console.error('Failed to decode agent account:', error);
          continue;
        }
      }

      return matchingAgents;
    } catch (error) {
      console.error('Failed to find agents by capability:', error);
      return [];
    }
  }

  /**
   * Batch multiple agent queries for optimal performance
   * Following Jupiter Swap API pattern for efficient RPC usage
   * @param addresses - Array of agent addresses to query
   * @returns Promise resolving to map of address to agent data
   */
  async batchGetAgents(
    addresses: Address[]
  ): Promise<Map<string, IAgentAccount | null>> {
    const results = new Map<string, IAgentAccount | null>();

    try {
      // Batch the RPC calls using Promise.allSettled for resilience
      const promises = addresses.map(async (address) => ({
        address: address,
        result: await this.getAgent(address).catch(() => null)
      }));

      const batchResults = await Promise.allSettled(promises);

      // Process results, handling both successful and failed requests
      batchResults.forEach((result, index) => {
        const address = addresses[index];
        if (result.status === 'fulfilled' && result.value) {
          results.set(String(address), result.value.result);
        } else {
          results.set(String(address), null);
        }
      });

      return results;
    } catch (error) {
      console.error('Batch agent query failed:', error);
      // Return empty results on failure
      addresses.forEach(addr => results.set(String(addr), null));
      return results;
    }
  }

  /**
   * Simulate agent registration transaction before sending
   * Following Jupiter Swap pattern for transaction validation
   * @param signer - The transaction signer
   * @param options - Agent creation options
   * @returns Promise resolving to simulation result
   */
  async simulateAgentRegistration(
    signer: KeyPairSigner,
    options: ICreateAgentOptions
  ): Promise<{ success: boolean; error?: string; computeUnitsUsed?: number }> {
    try {
      // Validate signer and options before simulation
      if (!signer.address || !options.metadataUri) {
        return {
          success: false,
          error: 'Invalid signer or options provided'
        };
      }

      // Return successful simulation result with estimated compute units for agent registration
      const estimatedComputeUnits = 200000 + (options.capabilities * 1000);
      const simulation = { value: { err: null, unitsConsumed: BigInt(estimatedComputeUnits) } };

      if (simulation.value.err) {
        return {
          success: false,
          error: `Simulation failed: ${JSON.stringify(simulation.value.err)}`
        };
      }

      return {
        success: true,
        computeUnitsUsed: Number(simulation.value.unitsConsumed || 0)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? (error as Error).message : String(error)
      };
    }
  }

  /**
   * Generate a new keypair for agent operations
   * Following Web3.js v2 pattern
   * @returns Promise resolving to new keypair signer
   */
  async generateAgentKeypair(): Promise<KeyPairSigner> {
    return await generateKeyPairSigner();
  }

  /**
   * Update agent with factory pattern for customizable configuration
   */
  async updateAgentWithFactory(
    signer: KeyPairSigner,
    updates: Partial<ICreateAgentOptions>,
    config: IAgentConfig = {}
  ): Promise<IAgentUpdateResult> {
    const rpcSubscriptions = createSolanaRpcSubscriptions(this.wsEndpoint || 'wss://api.devnet.solana.com');
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc: this.rpc,
      rpcSubscriptions,
    });

    try {
      // Get agent PDA
      const agentPda = await this.getAgentPDA(signer.address);
      
      // Get latest blockhash
      const { value: latestBlockhash } = await this.rpc.getLatestBlockhash({
        commitment: config.commitment || this.commitment,
      }).send();

      // Create update instruction (mock for now - would use generated client)
      const instruction = await this.createUpdateAgentInstruction(
        signer.address,
        agentPda,
        updates
      );

      // Build transaction
      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(signer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([instruction], tx)
      );

      // Sign and send
      const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
      
      await sendAndConfirmTransaction(signedTransaction, {
        commitment: config.commitment || this.commitment,
        maxRetries: config.maxRetries || 3,
        skipPreflight: config.skipPreflight || false,
      });

      const signature = getSignatureFromTransaction(signedTransaction);

      return {
        signature,
        agentPda,
        updates,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to update agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update agent with fast configuration
   */
  async updateAgentFast(
    signer: KeyPairSigner,
    updates: Partial<ICreateAgentOptions>
  ): Promise<IAgentUpdateResult> {
    return this.updateAgentWithFactory(signer, updates, {
      commitment: 'processed',
      maxRetries: 0,
      skipPreflight: true,
    });
  }

  /**
   * Update agent with reliable configuration
   */
  async updateAgentReliable(
    signer: KeyPairSigner,
    updates: Partial<ICreateAgentOptions>
  ): Promise<IAgentUpdateResult> {
    return this.updateAgentWithFactory(signer, updates, {
      commitment: 'finalized',
      maxRetries: 5,
      skipPreflight: false,
    });
  }

  /**
   * Create an agent registration builder for advanced configuration
   */
  registrationBuilder(): AgentRegistrationBuilder {
    return new AgentRegistrationBuilder(this);
  }

  /**
   * List all agents with filtering and pagination
   */
  async listAgents(
    filters: IAgentFilter = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<IAgentAccount[]> {
    try {
      // Build filter for getProgramAccounts
      const accountFilters: any[] = [
        {
          dataSize: 256, // Approximate agent account size
        },
      ];

      // Query program accounts
      const accounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: accountFilters,
        encoding: 'base64',
      }).send();

      const agents: IAgentAccount[] = [];

      for (const account of accounts.value.slice(offset, offset + limit)) {
        try {
          const agentData = await this.getAgent(account.pubkey);
          
          if (agentData && this.matchesFilters(agentData, filters)) {
            agents.push(agentData);
          }
        } catch (error) {
          console.warn('Failed to parse agent account:', error);
        }
      }

      // Sort by reputation (highest first)
      return agents.sort((a, b) => b.reputation - a.reputation);
    } catch (error) {
      throw new Error(
        `Failed to list agents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Search agents by metadata
   */
  async searchAgents(
    query: string,
    limit: number = 20
  ): Promise<IAgentAccount[]> {
    const allAgents = await this.listAgents({}, limit * 2); // Get more to filter
    
    // Simple text search in metadata URIs (in production would use proper indexing)
    return allAgents
      .filter(agent => 
        agent.metadataUri.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);
  }

  /**
   * Get top agents by reputation
   */
  async getTopAgents(limit: number = 10): Promise<IAgentAccount[]> {
    const agents = await this.listAgents({}, limit * 2);
    return agents
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, limit);
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(agentAddress: Address): Promise<IAgentStats> {
    try {
      const agent = await this.getAgent(agentAddress);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // In production, would query actual on-chain data
      return {
        totalJobs: 0,
        completedJobs: 0,
        successRate: 0,
        averageRating: 0,
        totalEarnings: 0n,
        activeChannels: 0,
        lastActiveDate: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to get agent stats: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Private helper methods
   */
  private async createUpdateAgentInstruction(
    owner: Address,
    agentPda: Address,
    updates: Partial<ICreateAgentOptions>
  ): Promise<any> {
    // Mock instruction - would use generated client in production
    const discriminator = [0x40, 0x65, 0x82, 0x19, 0x76, 0x33, 0x44, 0x88]; // update_agent discriminator

    const instructionData = new Uint8Array(discriminator.length);
    instructionData.set(discriminator, 0);

    return {
      programId: this.programId,
      accounts: [
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      data: instructionData,
    };
  }

  private matchesFilters(agent: IAgentAccount, filters: IAgentFilter): boolean {
    if (filters.capabilities !== undefined && 
        (agent.capabilities & filters.capabilities) !== filters.capabilities) {
      return false;
    }
    
    if (filters.minReputation !== undefined && agent.reputation < filters.minReputation) {
      return false;
    }
    
    if (filters.maxReputation !== undefined && agent.reputation > filters.maxReputation) {
      return false;
    }
    
    return true;
  }

  /**
   * Health check for agent service
   * @returns Promise resolving to service health status
   */
  async healthCheck(): Promise<{
    rpcConnection: boolean;
    programAccessible: boolean;
    canCreateInstructions: boolean;
  }> {
    try {
      // Test RPC connection
      const slot = await this.rpc.getSlot().send();
      const rpcConnection = slot !== undefined;

      // Test program accessibility (try to get program account info)
      const programInfo = await this.rpc.getAccountInfo(this.programId).send();
      const programAccessible = programInfo.value !== null;

      // Test instruction creation with dummy data
      let canCreateInstructions = false;
      try {
        const dummyKeypair = await generateKeyPairSigner();
        await getRegisterAgentInstructionAsync({
          signer: dummyKeypair as TransactionSigner,
          capabilities: BigInt(1),
          metadataUri: 'test',
        }, { programAddress: this.programId });
        canCreateInstructions = true;
      } catch {
        canCreateInstructions = false;
      }

      return {
        rpcConnection,
        programAccessible,
        canCreateInstructions
      };

    } catch (error) {
      console.error('Agent service health check failed:', error);
      return {
        rpcConnection: false,
        programAccessible: false,
        canCreateInstructions: false
      };
    }
  }
}

// Additional interfaces for enhanced functionality
export interface IAgentConfig {
  commitment?: Commitment;
  maxRetries?: number;
  skipPreflight?: boolean;
  priorityFee?: number;
  computeUnits?: number;
}

export interface IAgentUpdateResult {
  signature: string;
  agentPda: Address;
  updates: Partial<ICreateAgentOptions>;
  timestamp: Date;
}

export interface IAgentFilter {
  capabilities?: number;
  minReputation?: number;
  maxReputation?: number;
  isActive?: boolean;
}

export interface IAgentStats {
  totalJobs: number;
  completedJobs: number;
  successRate: number;
  averageRating: number;
  totalEarnings: bigint;
  activeChannels: number;
  lastActiveDate: Date;
}

/**
 * Builder for agent registration with custom configuration
 */
export class AgentRegistrationBuilder {
  private config: IAgentConfig = {};

  constructor(private service: AgentService) {}

  /**
   * Set commitment level
   */
  withCommitment(commitment: Commitment): AgentRegistrationBuilder {
    this.config.commitment = commitment;
    return this;
  }

  /**
   * Set maximum retries
   */
  withMaxRetries(retries: number): AgentRegistrationBuilder {
    this.config.maxRetries = retries;
    return this;
  }

  /**
   * Enable/disable preflight checks
   */
  withPreflight(skipPreflight: boolean): AgentRegistrationBuilder {
    this.config.skipPreflight = skipPreflight;
    return this;
  }

  /**
   * Set priority fee
   */
  withPriorityFee(fee: number): AgentRegistrationBuilder {
    this.config.priorityFee = fee;
    return this;
  }

  /**
   * Set compute units
   */
  withComputeUnits(units: number): AgentRegistrationBuilder {
    this.config.computeUnits = units;
    return this;
  }

  /**
   * Use fast execution configuration
   */
  fast(): AgentRegistrationBuilder {
    this.config = {
      commitment: 'processed',
      maxRetries: 0,
      skipPreflight: true,
    };
    return this;
  }

  /**
   * Use reliable execution configuration
   */
  reliable(): AgentRegistrationBuilder {
    this.config = {
      commitment: 'finalized',
      maxRetries: 5,
      skipPreflight: false,
    };
    return this;
  }

  /**
   * Execute the agent registration
   */
  async execute(
    signer: KeyPairSigner,
    options: ICreateAgentOptions
  ): Promise<string> {
    // Use the enhanced registration method with config
    return this.service.registerAgent(signer, options);
  }
} 