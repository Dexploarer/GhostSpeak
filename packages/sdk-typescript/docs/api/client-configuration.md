# Client Configuration

The `GhostSpeakClient` provides flexible configuration options to customize behavior for different environments and use cases.

## Basic Configuration

### Creating a Client

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { createSolanaRpc } from '@solana/kit';

// Basic client with default configuration
const rpc = createSolanaRpc('https://api.devnet.solana.com');
const client = GhostSpeakClient.create(rpc);
```

### Custom Program ID

```typescript
import { address } from '@solana/addresses';

const customProgramId = address('YourCustomProgramID...');
const client = GhostSpeakClient.create(rpc, customProgramId);
```

## Advanced Configuration

### Full Configuration Object

```typescript
const client = new GhostSpeakClient({
  // RPC connection (required)
  rpc: createSolanaRpc('https://api.mainnet-beta.solana.com'),
  
  // Optional RPC subscriptions for real-time updates
  rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com'),
  
  // Program ID (defaults to official deployment)
  programId: GHOSTSPEAK_PROGRAM_ID,
  
  // Commitment level for transactions
  commitment: 'finalized', // 'processed' | 'confirmed' | 'finalized'
  
  // Transaction timeout in milliseconds
  transactionTimeout: 60000, // 60 seconds
  
  // Default fee payer (if not specified in transactions)
  defaultFeePayer: address('YourFeePayerAddress...'),
  
  // Retry configuration
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    retryableErrors: ['BlockhashNotFound', 'TransactionTimeout']
  },
  
  // Cluster identifier
  cluster: 'mainnet-beta', // 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'
  
  // Custom RPC endpoint (for logging/analytics)
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  
  // Token 2022 configuration
  token2022: {
    enabled: true,
    defaultExpectTransferFees: true,
    maxFeeSlippageBasisPoints: 100, // 1%
    enableConfidentialTransfers: false,
    tokenProgramCacheTtl: 3600 // 1 hour
  }
});
```

## Configuration Options

### RPC Configuration

#### `rpc` (required)
The Solana RPC connection used for all blockchain operations.

```typescript
import { createSolanaRpc, createDefaultRpcTransport } from '@solana/kit';

// With custom transport options
const transport = createDefaultRpcTransport({
  url: 'https://api.devnet.solana.com',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

const rpc = createSolanaRpc({ transport });
```

#### `rpcSubscriptions` (optional)
WebSocket connection for real-time updates.

```typescript
import { createSolanaRpcSubscriptions } from '@solana/kit';

const rpcSubscriptions = createSolanaRpcSubscriptions(
  'wss://api.devnet.solana.com'
);
```

### Transaction Options

#### `commitment`
Controls when transactions are considered confirmed.

- `'processed'` - Fastest, least reliable
- `'confirmed'` - Default, good balance
- `'finalized'` - Slowest, most reliable

#### `transactionTimeout`
Maximum time to wait for transaction confirmation (milliseconds).

```typescript
// Wait up to 2 minutes for confirmation
transactionTimeout: 120000
```

#### `defaultFeePayer`
Address to use for transaction fees when not explicitly specified.

```typescript
defaultFeePayer: address('FeePayerPublicKey...')
```

### Retry Configuration

Configure automatic retry behavior for failed operations:

```typescript
retryConfig: {
  // Maximum number of retry attempts
  maxRetries: 5,
  
  // Initial delay between retries (ms)
  baseDelay: 1000,
  
  // Maximum delay between retries (ms)
  maxDelay: 60000,
  
  // Multiplier for exponential backoff
  backoffMultiplier: 2,
  
  // Error codes that trigger retries
  retryableErrors: [
    'BlockhashNotFound',
    'TransactionTimeout',
    'NetworkError'
  ]
}
```

### Token 2022 Configuration

Configure SPL Token 2022 behavior:

```typescript
token2022: {
  // Enable Token 2022 features globally
  enabled: true,
  
  // Expect transfer fees by default
  defaultExpectTransferFees: true,
  
  // Maximum acceptable fee slippage (basis points)
  // 100 = 1%
  maxFeeSlippageBasisPoints: 100,
  
  // Enable confidential transfers
  enableConfidentialTransfers: true,
  
  // Cache token program detection (seconds)
  tokenProgramCacheTtl: 3600
}
```

## Environment-Specific Configurations

### Development

```typescript
const devClient = new GhostSpeakClient({
  rpc: createSolanaRpc('https://api.devnet.solana.com'),
  cluster: 'devnet',
  commitment: 'confirmed',
  transactionTimeout: 30000
});
```

### Production

```typescript
const prodClient = new GhostSpeakClient({
  rpc: createSolanaRpc('https://your-rpc-provider.com'),
  cluster: 'mainnet-beta',
  commitment: 'finalized',
  transactionTimeout: 120000,
  retryConfig: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 60000
  }
});
```

### Local Testing

```typescript
const localClient = new GhostSpeakClient({
  rpc: createSolanaRpc('http://localhost:8899'),
  cluster: 'localnet',
  commitment: 'processed',
  transactionTimeout: 10000
});
```

## IPFS Configuration

Configure IPFS for large content storage:

```typescript
const clientWithIPFS = new GhostSpeakClient({
  rpc,
  ipfs: {
    // IPFS providers (tried in order)
    providers: [
      {
        name: 'infura',
        endpoint: 'https://ipfs.infura.io:5001',
        headers: {
          'Authorization': 'Basic ' + btoa('PROJECT_ID:PROJECT_SECRET')
        }
      },
      {
        name: 'pinata',
        apiKey: 'YOUR_PINATA_API_KEY',
        apiSecret: 'YOUR_PINATA_API_SECRET'
      },
      {
        name: 'local',
        endpoint: 'http://localhost:5001'
      }
    ],
    
    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000,
    
    // Content size threshold for IPFS (bytes)
    contentThreshold: 1024, // 1KB
    
    // Pin content by default
    pinByDefault: true,
    
    // Timeout for IPFS operations (ms)
    timeout: 30000
  }
});
```

## Best Practices

### 1. Use Environment Variables

```typescript
const client = new GhostSpeakClient({
  rpc: createSolanaRpc(process.env.SOLANA_RPC_URL),
  cluster: process.env.SOLANA_CLUSTER as 'mainnet-beta' | 'devnet',
  commitment: process.env.COMMITMENT_LEVEL as Commitment
});
```

### 2. Separate Configurations

```typescript
// config/development.ts
export const devConfig: GhostSpeakConfig = {
  rpc: createSolanaRpc('https://api.devnet.solana.com'),
  cluster: 'devnet',
  commitment: 'confirmed'
};

// config/production.ts
export const prodConfig: GhostSpeakConfig = {
  rpc: createSolanaRpc(process.env.RPC_URL),
  cluster: 'mainnet-beta',
  commitment: 'finalized',
  retryConfig: {
    maxRetries: 5,
    baseDelay: 2000
  }
};
```

### 3. Connection Pooling

For high-throughput applications:

```typescript
import { ConnectionPool } from '@ghostspeak/sdk/utils';

const pool = new ConnectionPool({
  endpoints: [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana'
  ],
  maxConnections: 10
});

const client = new GhostSpeakClient({
  rpc: pool.getRpc()
});
```

### 4. Health Checks

```typescript
// Check client health
const isHealthy = await client.checkHealth();

// Get cluster info
const clusterInfo = await client.getClusterInfo();
console.log('Connected to:', clusterInfo.cluster);
console.log('Block height:', clusterInfo.blockHeight);
```

## Configuration Validation

The SDK validates configuration on initialization:

```typescript
try {
  const client = new GhostSpeakClient(config);
} catch (error) {
  if (error.code === 'INVALID_CONFIG') {
    console.error('Configuration error:', error.message);
  }
}
```

Common validation errors:
- Missing required RPC connection
- Invalid commitment level
- Invalid cluster identifier
- Negative timeout values
- Invalid Token 2022 configuration