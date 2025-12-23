
import { AgentModule, MarketplaceModule, EscrowModule } from '@ghostspeak/sdk';
import { createSolanaRpc } from '@solana/kit';
import { address } from '@solana/addresses';

// Mock config
const config = {
    rpcEndpoint: 'https://api.devnet.solana.com',
    programId: address('GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9'),
    rpc: createSolanaRpc('https://api.devnet.solana.com'),
    commitment: 'confirmed' as const,
    cluster: 'devnet'
};

console.log('--- AgentModule Methods ---');
console.log(Object.getOwnPropertyNames(AgentModule.prototype));

// console.log('\n--- MarketplaceModule Methods ---');
// console.log(Object.getOwnPropertyNames(MarketplaceModule.prototype));

// console.log('\n--- EscrowModule Methods ---');
// console.log(Object.getOwnPropertyNames(EscrowModule.prototype));
