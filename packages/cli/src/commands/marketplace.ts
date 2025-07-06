import { MarketplaceService } from '@podai/sdk';
import type { Address } from '@podai/sdk';
import { getRpc, getProgramId, getCommitment, getKeypair } from '../context-helpers';

/**
 * List all marketplace services using the real SDK MarketplaceService
 * @param options - Listing options (optional)
 */
export async function listServices(options?: any): Promise<void> {
  try {
    const rpc = await getRpc();
    const programId = getProgramId('marketplace');
    const commitment = await getCommitment();
    const marketplaceService = new MarketplaceService(rpc, programId, commitment);
    // For now, getActiveListings is the main listing method
    const services = await marketplaceService.getActiveListings(options?.limit || 50);
    console.log('🛒 Marketplace services:', services);
  } catch (error) {
    console.error('❌ Failed to list marketplace services:', error);
  }
}

/**
 * Purchase a service using the real SDK MarketplaceService
 * @param serviceId - The ID of the service listing
 * @param options - Purchase options (buyer, etc.)
 */
export async function purchaseService(serviceId: Address, options?: any): Promise<void> {
  try {
    const rpc = await getRpc();
    const programId = getProgramId('marketplace');
    const commitment = await getCommitment();
    const buyer = await getKeypair();
    const marketplaceService = new MarketplaceService(rpc, programId, commitment);
    // For now, use purchaseService with mock data
    const purchaseData = options?.purchaseData || {};
    const signature = await marketplaceService.purchaseService(buyer, serviceId, serviceId, purchaseData);
    console.log('✅ Purchased service. Signature:', signature);
  } catch (error) {
    console.error('❌ Failed to purchase service:', error);
  }
}

// TODO: Add more marketplace operations as SDK expands
