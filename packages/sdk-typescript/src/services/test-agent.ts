/**
 * Test Agent Service - Utility for testing agent functionality
 */

import type { ICreateAgentOptions } from '../types';
import type { KeyPairSigner } from '@solana/signers';

import { AgentService } from './agent';

/**
 * Service for testing agent operations
 */
export class TestAgentService {
  constructor(private readonly agentService: AgentService) {}

  /**
   * Create a test agent with default configuration
   */
  async createTestAgent(
    signer: KeyPairSigner,
    overrides: Partial<ICreateAgentOptions> = {}
  ): Promise<string> {
    const defaultOptions: ICreateAgentOptions = {
      capabilities: 1, // Basic capability
      metadataUri: 'https://example.com/test-agent-metadata.json',
      ...overrides,
    };

    return await this.agentService.registerAgent(signer, defaultOptions);
  }

  /**
   * Run a comprehensive test of agent operations
   */
  async runAgentTest(signer: KeyPairSigner): Promise<void> {
    try {
      console.log('Starting agent test...');

      // Test agent registration
      const signature = await this.createTestAgent(signer);
      console.log(`✅ Agent registered with signature: ${signature}`);

      // Test agent retrieval
      const agentPDA = await this.agentService.getAgentPDA(signer.address);
      const agent = await this.agentService.getAgent(agentPDA);

      if (agent) {
        console.log('✅ Agent retrieved successfully:', agent.metadataUri);
      } else {
        console.log('❌ Failed to retrieve agent');
      }

      console.log('✅ Agent test completed successfully');
    } catch (error) {
      console.error('❌ Agent test failed:', error);
      throw error;
    }
  }
}
