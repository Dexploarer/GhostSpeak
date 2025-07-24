# Configuration Options Reference

Complete reference for all configuration options in the GhostSpeak SDK.

## Table of Contents

1. [Client Configuration](#client-configuration)
2. [RPC Configuration](#rpc-configuration)
3. [Token 2022 Configuration](#token-2022-configuration)
4. [IPFS Configuration](#ipfs-configuration)
5. [Retry Configuration](#retry-configuration)
6. [Transaction Configuration](#transaction-configuration)
7. [Environment Configuration](#environment-configuration)

## Client Configuration

### GhostSpeakConfig

Main configuration object for the GhostSpeak client.

```typescript
interface GhostSpeakConfig {
  // Core settings
  programId?: Address;              
  rpc: ExtendedRpcApi;             
  rpcSubscriptions?: RpcSubscriptionApi;
  
  // Transaction settings
  commitment?: Commitment;          
  transactionTimeout?: number;      
  defaultFeePayer?: Address;        
  
  // Network settings
  cluster?: Cluster;                
  rpcEndpoint?: string;            
  
  // Feature configurations
  retryConfig?: RetryConfig;        
  token2022?: Token2022Config;     
  ipfs?: IPFSConfig;               
}
```

### Configuration Options

#### `programId`
- **Type**: `Address`
- **Default**: `'GHSTjJQNkV5tYzfJpKRFvW3h3p5SrTFdahDNhL54ump'` (mainnet)
- **Description**: GhostSpeak program ID. Changes based on cluster.

```typescript
// Custom program ID for local testing
const config = {
  programId: address('YourLocalProgramID...'),
  // ...
};
```

#### `commitment`
- **Type**: `'processed' | 'confirmed' | 'finalized'`
- **Default**: `'confirmed'`
- **Description**: Transaction confirmation level.

```typescript
// Different commitment levels
const configs = {
  fast: { commitment: 'processed' },    // Fastest, least reliable
  balanced: { commitment: 'confirmed' }, // Default, good balance
  safe: { commitment: 'finalized' }     // Slowest, most reliable
};
```

#### `transactionTimeout`
- **Type**: `number` (milliseconds)
- **Default**: `30000` (30 seconds)
- **Description**: Maximum time to wait for transaction confirmation.

```typescript
// Longer timeout for complex operations
const config = {
  transactionTimeout: 60000, // 60 seconds
  // ...
};
```

#### `defaultFeePayer`
- **Type**: `Address`
- **Default**: `undefined`
- **Description**: Default account to pay transaction fees.

```typescript
// Set default fee payer
const config = {
  defaultFeePayer: address('FeePayerPublicKey...'),
  // ...
};
```

#### `cluster`
- **Type**: `'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'`
- **Default**: Inferred from RPC endpoint
- **Description**: Solana cluster identifier.

```typescript
// Explicit cluster configuration
const configs = {
  production: { cluster: 'mainnet-beta' },
  development: { cluster: 'devnet' },
  testing: { cluster: 'localnet' }
};
```

## RPC Configuration

### RPC Connection

Configure the RPC connection using `@solana/kit`.

```typescript
import { createSolanaRpc, createDefaultRpcTransport } from '@solana/kit';

// Basic RPC
const rpc = createSolanaRpc('https://api.devnet.solana.com');

// Custom RPC with headers
const transport = createDefaultRpcTransport({
  url: 'https://your-rpc-provider.com',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'X-Custom-Header': 'value'
  }
});
const rpc = createSolanaRpc({ transport });

// With request interceptor
const transport = createDefaultRpcTransport({
  url: 'https://api.mainnet-beta.solana.com',
  interceptor: (request) => {
    console.log('RPC Request:', request.method);
    return request;
  }
});
```

### WebSocket Subscriptions

Configure real-time subscriptions.

```typescript
import { createSolanaRpcSubscriptions } from '@solana/kit';

// Basic WebSocket
const subscriptions = createSolanaRpcSubscriptions(
  'wss://api.devnet.solana.com'
);

// With reconnection logic
const subscriptions = createSolanaRpcSubscriptions(
  'wss://api.mainnet-beta.solana.com',
  {
    reconnect: true,
    reconnectInterval: 1000,
    maxReconnectAttempts: 10
  }
);

// Add to config
const config = {
  rpc,
  rpcSubscriptions: subscriptions
};
```

### Connection Pool

For high-throughput applications.

```typescript
import { ConnectionPool } from '@ghostspeak/sdk/utils';

const pool = new ConnectionPool({
  endpoints: [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana'
  ],
  maxConnections: 10,
  strategy: 'round-robin', // or 'least-loaded', 'random'
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000
  }
});

const config = {
  rpc: pool.getRpc(),
  // ...
};
```

## Token 2022 Configuration

### Token2022Config

Configuration for SPL Token 2022 features.

```typescript
interface Token2022Config {
  enabled?: boolean;
  defaultExpectTransferFees?: boolean;
  maxFeeSlippageBasisPoints?: number;
  enableConfidentialTransfers?: boolean;
  programAddress?: Address;
  tokenProgramCacheTtl?: number;
}
```

### Token 2022 Options

#### `enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable Token 2022 features globally.

#### `defaultExpectTransferFees`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Expect transfer fees by default for Token 2022 mints.

```typescript
const config = {
  token2022: {
    enabled: true,
    defaultExpectTransferFees: true, // Always account for fees
    maxFeeSlippageBasisPoints: 100   // Allow 1% fee variance
  }
};
```

#### `enableConfidentialTransfers`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable confidential transfer support.

```typescript
const config = {
  token2022: {
    enableConfidentialTransfers: true,
    // Requires additional setup for ElGamal keys
  }
};
```

#### `tokenProgramCacheTtl`
- **Type**: `number` (seconds)
- **Default**: `3600` (1 hour)
- **Description**: Cache token program detection results.

```typescript
const config = {
  token2022: {
    tokenProgramCacheTtl: 7200 // Cache for 2 hours
  }
};
```

## IPFS Configuration

### IPFSConfig

Configuration for IPFS integration.

```typescript
interface IPFSConfig {
  providers: IPFSProvider[];
  maxRetries?: number;
  retryDelay?: number;
  maxFileSize?: number;
  contentThreshold?: number;
  pinByDefault?: boolean;
  pinningService?: string;
  uploadTimeout?: number;
  downloadTimeout?: number;
  circuitBreaker?: CircuitBreakerConfig;
}
```

### IPFS Provider Configuration

```typescript
interface IPFSProvider {
  name: string;
  endpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  headers?: Record<string, string>;
  priority?: number;
}
```

### Example Configurations

```typescript
// Multi-provider setup
const ipfsConfig: IPFSConfig = {
  providers: [
    {
      name: 'infura',
      endpoint: 'https://ipfs.infura.io:5001',
      headers: {
        'Authorization': 'Basic ' + btoa(`${PROJECT_ID}:${PROJECT_SECRET}`)
      },
      priority: 1
    },
    {
      name: 'pinata',
      apiKey: process.env.PINATA_API_KEY,
      apiSecret: process.env.PINATA_API_SECRET,
      priority: 2
    },
    {
      name: 'local',
      endpoint: 'http://localhost:5001',
      priority: 3
    }
  ],
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 1000,
  
  // Size limits
  maxFileSize: 104857600, // 100MB
  contentThreshold: 1024, // Use IPFS for > 1KB
  
  // Pinning
  pinByDefault: true,
  pinningService: 'pinata',
  
  // Timeouts
  uploadTimeout: 30000,
  downloadTimeout: 20000,
  
  // Circuit breaker
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000
  }
};
```

## Retry Configuration

### RetryConfig

Configuration for automatic retry behavior.

```typescript
interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}
```

### Retry Examples

```typescript
// Aggressive retry
const aggressiveRetry: RetryConfig = {
  maxRetries: 10,
  baseDelay: 500,
  maxDelay: 30000,
  backoffMultiplier: 1.5,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RPC_ERROR',
    'BlockhashNotFound',
    'TransactionTimeout'
  ]
};

// Conservative retry
const conservativeRetry: RetryConfig = {
  maxRetries: 3,
  baseDelay: 2000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT']
};

// Custom retry logic
const customRetry: RetryConfig = {
  maxRetries: 5,
  shouldRetry: (error, attempt) => {
    // Don't retry after 3 attempts for rate limits
    if (error.code === 'RATE_LIMITED' && attempt > 3) {
      return false;
    }
    // Always retry network errors
    if (error.code === 'NETWORK_ERROR') {
      return true;
    }
    // Default behavior
    return attempt < 5;
  },
  onRetry: (error, attempt) => {
    console.log(`Retry attempt ${attempt} for error: ${error.message}`);
  }
};
```

## Transaction Configuration

### Transaction Options

Configure transaction behavior.

```typescript
interface TransactionOptions {
  // Confirmation
  commitment?: Commitment;
  preflightCommitment?: Commitment;
  
  // Simulation
  skipPreflight?: boolean;
  maxRetries?: number;
  
  // Compute budget
  computeUnitPrice?: number;
  computeUnitLimit?: number;
  
  // Advanced
  minContextSlot?: number;
  addressLookupTableAccounts?: Address[];
}
```

### Examples

```typescript
// High-priority transaction
const highPriority: TransactionOptions = {
  skipPreflight: false,
  maxRetries: 5,
  computeUnitPrice: 1000000, // Higher priority fee
  computeUnitLimit: 400000   // Increase compute budget
};

// Safe transaction
const safeTransaction: TransactionOptions = {
  commitment: 'finalized',
  preflightCommitment: 'finalized',
  skipPreflight: false,
  maxRetries: 3
};

// Fast transaction
const fastTransaction: TransactionOptions = {
  commitment: 'processed',
  skipPreflight: true,
  maxRetries: 1
};
```

## Environment Configuration

### Environment Variables

Recommended environment variables for configuration.

```env
# Network
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com

# Program IDs
GHOSTSPEAK_PROGRAM_ID=GHSTjJQNkV5tYzfJpKRFvW3h3p5SrTFdahDNhL54ump

# IPFS
IPFS_INFURA_PROJECT_ID=your_project_id
IPFS_INFURA_PROJECT_SECRET=your_secret
IPFS_PINATA_API_KEY=your_api_key
IPFS_PINATA_API_SECRET=your_api_secret

# Features
ENABLE_TOKEN_2022=true
ENABLE_CONFIDENTIAL_TRANSFERS=false
ENABLE_IPFS=true

# Performance
MAX_RETRIES=3
TRANSACTION_TIMEOUT=30000
COMPUTE_UNIT_PRICE=1000

# Monitoring
MONITORING_ENABLED=true
MONITORING_ENDPOINT=https://monitoring.ghostspeak.ai
```

### Loading Environment Configuration

```typescript
import { config as dotenv } from 'dotenv';
dotenv();

function loadConfigFromEnv(): GhostSpeakConfig {
  return {
    cluster: process.env.SOLANA_CLUSTER as Cluster || 'devnet',
    rpc: createSolanaRpc(process.env.SOLANA_RPC_URL!),
    rpcSubscriptions: process.env.SOLANA_WS_URL 
      ? createSolanaRpcSubscriptions(process.env.SOLANA_WS_URL)
      : undefined,
    
    programId: process.env.GHOSTSPEAK_PROGRAM_ID
      ? address(process.env.GHOSTSPEAK_PROGRAM_ID)
      : undefined,
    
    commitment: process.env.COMMITMENT as Commitment || 'confirmed',
    transactionTimeout: parseInt(process.env.TRANSACTION_TIMEOUT || '30000'),
    
    retryConfig: {
      maxRetries: parseInt(process.env.MAX_RETRIES || '3')
    },
    
    token2022: {
      enabled: process.env.ENABLE_TOKEN_2022 === 'true',
      enableConfidentialTransfers: 
        process.env.ENABLE_CONFIDENTIAL_TRANSFERS === 'true'
    },
    
    ipfs: process.env.ENABLE_IPFS === 'true' ? {
      providers: [
        {
          name: 'infura',
          endpoint: 'https://ipfs.infura.io:5001',
          headers: {
            'Authorization': 'Basic ' + btoa(
              `${process.env.IPFS_INFURA_PROJECT_ID}:` +
              `${process.env.IPFS_INFURA_PROJECT_SECRET}`
            )
          }
        }
      ]
    } : undefined
  };
}
```

## Configuration Profiles

### Predefined Profiles

```typescript
const configProfiles = {
  // Development profile
  development: {
    cluster: 'devnet' as Cluster,
    commitment: 'confirmed' as Commitment,
    transactionTimeout: 30000,
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000
    }
  },
  
  // Production profile
  production: {
    cluster: 'mainnet-beta' as Cluster,
    commitment: 'finalized' as Commitment,
    transactionTimeout: 60000,
    retryConfig: {
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 30000
    },
    token2022: {
      enabled: true,
      defaultExpectTransferFees: true
    }
  },
  
  // Testing profile
  testing: {
    cluster: 'localnet' as Cluster,
    commitment: 'processed' as Commitment,
    transactionTimeout: 10000,
    retryConfig: {
      maxRetries: 1
    }
  }
};

// Load profile
const profile = process.env.NODE_ENV || 'development';
const config = {
  rpc: createSolanaRpc(getRpcUrl(profile)),
  ...configProfiles[profile]
};
```

## Validation

### Configuration Validation

The SDK validates configuration on initialization:

```typescript
function validateConfig(config: GhostSpeakConfig): void {
  // Required fields
  if (!config.rpc) {
    throw new Error('RPC connection is required');
  }
  
  // Valid commitment
  const validCommitments = ['processed', 'confirmed', 'finalized'];
  if (config.commitment && !validCommitments.includes(config.commitment)) {
    throw new Error(`Invalid commitment: ${config.commitment}`);
  }
  
  // Positive timeout
  if (config.transactionTimeout && config.transactionTimeout <= 0) {
    throw new Error('Transaction timeout must be positive');
  }
  
  // Valid cluster
  const validClusters = ['mainnet-beta', 'devnet', 'testnet', 'localnet'];
  if (config.cluster && !validClusters.includes(config.cluster)) {
    throw new Error(`Invalid cluster: ${config.cluster}`);
  }
  
  // Token 2022 validation
  if (config.token2022) {
    if (config.token2022.maxFeeSlippageBasisPoints &&
        (config.token2022.maxFeeSlippageBasisPoints < 0 ||
         config.token2022.maxFeeSlippageBasisPoints > 10000)) {
      throw new Error('Fee slippage must be 0-10000 basis points');
    }
  }
}
```

## Migration Guide

### Migrating from v1.x to v2.x

```typescript
// Old configuration (v1.x)
const oldConfig = {
  connection: new Connection('https://api.devnet.solana.com'),
  wallet: wallet.adapter,
  programId: PROGRAM_ID
};

// New configuration (v2.x)
const newConfig: GhostSpeakConfig = {
  rpc: createSolanaRpc('https://api.devnet.solana.com'),
  programId: address(PROGRAM_ID),
  commitment: 'confirmed'
};

// Migration helper
function migrateConfig(oldConfig: any): GhostSpeakConfig {
  return {
    rpc: createSolanaRpc(oldConfig.connection.rpcEndpoint),
    programId: address(oldConfig.programId.toString()),
    commitment: oldConfig.commitment || 'confirmed'
  };
}
```