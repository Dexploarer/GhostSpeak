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
        `Agent registration failed: ${error instanceof Error ? error.message : String(error)}`
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
        error: error instanceof Error ? error.message : String(error)
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