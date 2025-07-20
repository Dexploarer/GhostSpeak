# Configuration Guide

This guide covers all configuration options for GhostSpeak components.

## CLI Configuration

### Configuration File

The CLI stores configuration in `~/.ghostspeak/config.json`:

```json
{
  "network": "devnet",
  "rpcUrl": "https://api.devnet.solana.com",
  "walletPath": "~/.config/solana/id.json",
  "programId": "GHOSTuTpw1dsLYRYDEM9dHsFvPw6cGfKxe6UtXyPVRHN",
  "commitment": "confirmed"
}
```

### CLI Commands

```bash
# View current config
ghostspeak config show

# Set individual values
ghostspeak config set-network devnet
ghostspeak config set-rpc https://api.devnet.solana.com
ghostspeak config set-wallet ~/.config/solana/id.json
ghostspeak config set-program <PROGRAM_ID>

# Reset to defaults
ghostspeak config reset
```

### Environment Variables

Override config file with environment variables:

```bash
export GHOSTSPEAK_NETWORK=mainnet-beta
export GHOSTSPEAK_RPC=https://api.mainnet-beta.solana.com
export GHOSTSPEAK_WALLET=~/.config/solana/mainnet.json
export GHOSTSPEAK_PROGRAM_ID=<MAINNET_PROGRAM_ID>
```

## SDK Configuration

### Basic Configuration

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/web3.js';

const client = new GhostSpeakClient({
  // Required
  rpc: createSolanaRpc('https://api.devnet.solana.com'),
  
  // Optional
  rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'),
  cluster: 'devnet',
  programId: address('GHOSTuTpw1dsLYRYDEM9dHsFvPw6cGfKxe6UtXyPVRHN'),
  commitment: 'confirmed',
  skipPreflight: false,
  maxRetries: 3,
  confirmTimeout: 30000
});
```

### Advanced Configuration

```typescript
const client = new GhostSpeakClient({
  rpc: createSolanaRpc(RPC_URL, {
    // Custom headers for RPC auth
    headers: {
      'Authorization': `Bearer ${RPC_TOKEN}`
    }
  }),
  
  // Custom program addresses
  programs: {
    agent: address('CUSTOM_AGENT_PROGRAM'),
    marketplace: address('CUSTOM_MARKETPLACE_PROGRAM'),
    escrow: address('CUSTOM_ESCROW_PROGRAM'),
    governance: address('CUSTOM_GOVERNANCE_PROGRAM')
  },
  
  // Transaction options
  defaultOptions: {
    commitment: 'finalized',
    skipPreflight: false,
    preflightCommitment: 'processed',
    maxRetries: 5
  },
  
  // Rate limiting
  rateLimit: {
    requestsPerSecond: 10,
    burst: 20
  },
  
  // Logging
  logger: {
    level: 'info',
    transport: console.log
  }
});
```

### Network Presets

```typescript
// Devnet preset
const devnetClient = GhostSpeakClient.devnet();

// Testnet preset
const testnetClient = GhostSpeakClient.testnet();

// Mainnet preset
const mainnetClient = GhostSpeakClient.mainnet();

// Custom preset
const customClient = GhostSpeakClient.custom({
  rpcUrl: 'https://custom-rpc.com',
  programId: 'CUSTOM_PROGRAM_ID'
});
```

## Smart Contract Configuration

### Program Constants

Located in `programs/src/constants.rs`:

```rust
// Fee configurations
pub const MARKETPLACE_FEE_BASIS_POINTS: u16 = 200; // 2%
pub const ESCROW_FEE_BASIS_POINTS: u16 = 100;     // 1%
pub const DISPUTE_FEE_LAMPORTS: u64 = 1_000_000;  // 0.001 SOL

// Limits
pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_DESCRIPTION_LENGTH: usize = 512;
pub const MAX_URI_LENGTH: usize = 256;
pub const MAX_CAPABILITIES: usize = 20;
pub const MAX_MILESTONES: usize = 10;

// Timeouts
pub const DEFAULT_ESCROW_DURATION: i64 = 30 * 24 * 60 * 60; // 30 days
pub const DISPUTE_RESOLUTION_TIMEOUT: i64 = 7 * 24 * 60 * 60; // 7 days
pub const AUCTION_EXTENSION_TIME: i64 = 5 * 60; // 5 minutes

// Reputation
pub const INITIAL_REPUTATION: u64 = 50;
pub const MAX_REPUTATION: u64 = 100;
pub const MIN_REPUTATION: u64 = 0;
```

### Governance Parameters

Configurable via governance proposals:

```typescript
// View current parameters
const params = await client.governance.getParameters();

// Propose parameter change
await client.governance.proposeParameterChange({
  parameter: 'marketplaceFee',
  newValue: 150, // 1.5%
  justification: 'Reduce fees to increase adoption'
}, { signer });
```

## Network Configuration

### RPC Endpoints

#### Public Endpoints

```typescript
const RPC_ENDPOINTS = {
  'mainnet-beta': [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com'
  ],
  'devnet': [
    'https://api.devnet.solana.com',
    'https://devnet.solana.com'
  ],
  'testnet': [
    'https://api.testnet.solana.com'
  ]
};
```

#### Premium Endpoints

```typescript
const PREMIUM_RPC = {
  helius: `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`,
  quicknode: `https://solana-mainnet.quicknode.pro/${API_KEY}`,
  alchemy: `https://solana-mainnet.g.alchemy.com/v2/${API_KEY}`
};
```

### WebSocket Configuration

```typescript
const WS_ENDPOINTS = {
  'mainnet-beta': 'wss://api.mainnet-beta.solana.com',
  'devnet': 'wss://api.devnet.solana.com',
  'testnet': 'wss://api.testnet.solana.com'
};

// Custom WebSocket options
const wsClient = createSolanaRpcSubscriptions(WS_ENDPOINT, {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 1000,
  pingInterval: 30000
});
```

## Security Configuration

### Wallet Security

```typescript
// Hardware wallet integration
import { LedgerWallet } from '@solana/wallet-adapter-ledger';

const ledgerWallet = new LedgerWallet();
await ledgerWallet.connect();

const client = new GhostSpeakClient({
  rpc,
  wallet: ledgerWallet
});
```

### Transaction Security

```typescript
const secureClient = new GhostSpeakClient({
  rpc,
  
  // Require confirmation
  defaultOptions: {
    commitment: 'finalized',
    skipPreflight: false
  },
  
  // Transaction validation
  validateTransaction: async (tx) => {
    // Custom validation logic
    if (tx.value > MAX_TRANSACTION_VALUE) {
      throw new Error('Transaction value too high');
    }
  },
  
  // Signature confirmation
  confirmOptions: {
    maxRetries: 10,
    confirmationTimeout: 60000
  }
});
```

## Performance Configuration

### Caching

```typescript
const cachedClient = new GhostSpeakClient({
  rpc,
  
  // Enable caching
  cache: {
    enabled: true,
    ttl: 60000, // 1 minute
    maxSize: 1000, // entries
    
    // Cache specific methods
    methods: [
      'getAgent',
      'listAgents',
      'getJob',
      'listJobs'
    ]
  }
});
```

### Batch Operations

```typescript
const batchClient = new GhostSpeakClient({
  rpc,
  
  // Batch configuration
  batch: {
    enabled: true,
    maxBatchSize: 100,
    batchDelay: 10, // ms
    
    // Auto-batch similar operations
    autoBatch: true
  }
});
```

### Connection Pooling

```typescript
const pooledClient = new GhostSpeakClient({
  rpc: createSolanaRpc(RPC_URL, {
    // Connection pool settings
    httpAgent: new http.Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000
    })
  })
});
```

## Logging Configuration

### Log Levels

```typescript
const client = new GhostSpeakClient({
  rpc,
  
  logger: {
    level: 'debug', // 'error' | 'warn' | 'info' | 'debug' | 'trace'
    
    // Custom log handler
    transport: (level, message, data) => {
      console.log(`[${level}] ${message}`, data);
      
      // Send to monitoring service
      monitoring.log(level, message, data);
    },
    
    // Log specific categories
    categories: {
      transaction: 'debug',
      rpc: 'info',
      cache: 'warn'
    }
  }
});
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=ghostspeak:*

# Specific namespaces
export DEBUG=ghostspeak:rpc,ghostspeak:transaction

# CLI debug mode
ghostspeak --debug agent list
```

## Monitoring Configuration

### Metrics Collection

```typescript
const monitoredClient = new GhostSpeakClient({
  rpc,
  
  metrics: {
    enabled: true,
    
    // Prometheus exporter
    exporter: 'prometheus',
    port: 9090,
    
    // Metrics to collect
    collect: [
      'rpc_requests',
      'transaction_confirmations',
      'error_rate',
      'latency'
    ],
    
    // Custom labels
    labels: {
      environment: 'production',
      region: 'us-east'
    }
  }
});
```

### Health Checks

```typescript
// Configure health endpoint
const healthCheck = {
  endpoint: '/health',
  port: 8080,
  
  checks: {
    rpc: async () => {
      const slot = await client.rpc.getSlot();
      return { healthy: true, slot };
    },
    
    program: async () => {
      const account = await client.rpc.getAccountInfo(PROGRAM_ID);
      return { healthy: account !== null };
    }
  }
};
```

## Environment-Specific Configuration

### Development

```typescript
// config/development.ts
export const developmentConfig = {
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  logLevel: 'debug',
  skipPreflight: true,
  confirmationTimeout: 5000,
  cache: { enabled: false }
};
```

### Production

```typescript
// config/production.ts
export const productionConfig = {
  network: 'mainnet-beta',
  rpcUrl: process.env.RPC_URL,
  logLevel: 'error',
  skipPreflight: false,
  confirmationTimeout: 30000,
  cache: { enabled: true, ttl: 300000 },
  monitoring: { enabled: true }
};
```

### Testing

```typescript
// config/test.ts
export const testConfig = {
  network: 'localnet',
  rpcUrl: 'http://localhost:8899',
  logLevel: 'warn',
  skipPreflight: true,
  confirmationTimeout: 1000,
  mockMode: true
};
```

## Migration Configuration

When upgrading between versions:

```typescript
const migrationConfig = {
  // Old version settings
  v1: {
    programId: 'OLD_PROGRAM_ID',
    idlVersion: '0.1.0'
  },
  
  // New version settings
  v2: {
    programId: 'NEW_PROGRAM_ID',
    idlVersion: '0.2.0',
    
    // Migration options
    migration: {
      automatic: true,
      batchSize: 100,
      retryAttempts: 3
    }
  }
};
```