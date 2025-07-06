import { AgentService } from '@podai/sdk';
import type { ICreateAgentOptions } from '@podai/sdk';
import { getRpc, getRpcSubscriptions, getProgramId, getCommitment, getKeypair } from '../context-helpers';

/**
 * Register a new agent using the real SDK AgentService
 * @param name - Agent name
 * @param options - Agent creation options (description, capabilities, metadata)
 */
export async function registerAgent(name: string, options: Partial<ICreateAgentOptions>): Promise<void> {
  try {
    const rpc = await getRpc();
    const rpcSubscriptions = getRpcSubscriptions();
    const programId = getProgramId('agent');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const agentService = new AgentService(rpc, rpcSubscriptions, programId, commitment);
    const result = await agentService.registerAgent(signer, { name, ...options });
    console.log('✅ Registered agent:', result);
  } catch (error) {
    console.error('❌ Failed to register agent:', error);
  }
}

export async function replicateAgent(agentId: string, options: any): Promise<void> {
  // TODO: Implement agent replication with SDK
  console.log('Replicate agent (placeholder):', { agentId, options });
}

/**
 * List all agents for the current user using the real SDK AgentService
 */
export async function listAgents(): Promise<void> {
  try {
    const rpc = await getRpc();
    const rpcSubscriptions = getRpcSubscriptions();
    const programId = getProgramId('agent');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const agentService = new AgentService(rpc, rpcSubscriptions, programId, commitment);
    const agents = await agentService.listUserAgents(signer.address);
    console.log('👤 Agents:', agents);
  } catch (error) {
    console.error('❌ Failed to list agents:', error);
  }
}

/**
 * Remove an agent (not implemented in SDK, placeholder for future)
 * @param name - Agent name
 */
export async function removeAgent(name: string): Promise<void> {
  console.log(`Removing agent: ${name}`);
  // Not implemented in SDK yet
}

// TODO: Add more agent operations as SDK expands
