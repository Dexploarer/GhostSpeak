import { ChannelService } from '@podai/sdk';
import type { ICreateChannelOptions } from '@podai/sdk';
import { getRpc, getRpcSubscriptions, getProgramId, getCommitment, getKeypair } from '../context-helpers';

// TODO: Implement context helpers for RPC, subscriptions, programId, commitment, and keypair
function getRpc() { throw new Error('getRpc not implemented'); }
function getRpcSubscriptions() { throw new Error('getRpcSubscriptions not implemented'); }
function getProgramId(_service: string) { throw new Error('getProgramId not implemented'); }
function getCommitment() { return 'confirmed'; }
// TODO: Replace with real keypair logic
async function getKeypair() { return { address: 'mock-address' }; }

/**
 * Create a new channel using the real SDK ChannelService
 * @param name - Channel name
 * @param options - Channel creation options (description, visibility, etc.)
 */
export async function createChannel(name: string, options: Partial<ICreateChannelOptions>): Promise<void> {
  try {
    const rpc = await getRpc();
    const rpcSubscriptions = getRpcSubscriptions();
    const programId = getProgramId('channel');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const channelService = new ChannelService(rpc, rpcSubscriptions, programId, commitment);
    const result = await channelService.createChannel(signer, { name, ...options });
    console.log('✅ Created channel:', result);
  } catch (error) {
    console.error('❌ Failed to create channel:', error);
  }
}

/**
 * List all channels for the current user using the real SDK ChannelService
 * @param options - Listing options (optional)
 */
export async function listChannels(options?: any): Promise<void> {
  try {
    const rpc = await getRpc();
    const rpcSubscriptions = getRpcSubscriptions();
    const programId = getProgramId('channel');
    const commitment = await getCommitment();
    const signer = await getKeypair();
    const channelService = new ChannelService(rpc, rpcSubscriptions, programId, commitment);
    const channels = await channelService.listUserChannels(signer.address);
    console.log('📡 Channels:', channels);
  } catch (error) {
    console.error('❌ Failed to list channels:', error);
  }
}

// TODO: Add more channel operations as SDK expands
