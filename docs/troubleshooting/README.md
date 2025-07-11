# Troubleshooting Guide

Comprehensive troubleshooting guide for GhostSpeak development and deployment issues.

## 🔍 Quick Diagnosis

### Problem Categories
| Issue Type | Symptoms | Quick Fix |
|------------|----------|-----------|
| [Build Issues](#build-issues) | Compilation errors, dependency conflicts | Clear cache, reinstall dependencies |
| [Runtime Errors](#runtime-errors) | Application crashes, unexpected behavior | Check logs, verify configuration |
| [Network Issues](#network-issues) | Connection timeouts, RPC failures | Check network connectivity, endpoint status |
| [Performance Issues](#performance-issues) | Slow responses, high resource usage | Profile application, optimize queries |
| [Smart Contract Issues](#smart-contract-issues) | Transaction failures, account errors | Verify account states, check balances |

### Emergency Checklist
- [ ] Check [GhostSpeak Status Page](https://status.ghostspeak.com) for known issues
- [ ] Verify your environment variables are correct
- [ ] Ensure all services are running
- [ ] Check recent changes that might have caused the issue
- [ ] Look for error messages in logs

## 🏗️ Build Issues

### Common Build Problems

#### TypeScript Compilation Errors
```bash
# Error: Cannot find module '@solana/web3.js'
# Solution: Install dependencies
bun install

# Error: Type errors in strict mode
# Solution: Fix TypeScript configuration
npm run type-check
```

#### Rust Compilation Issues
```bash
# Error: linker `cc` not found
# Solution: Install build tools
# Ubuntu/Debian
sudo apt install build-essential

# macOS
xcode-select --install

# Error: cargo build failed
# Solution: Clear cache and rebuild
cargo clean
cargo build
```

#### Anchor Build Problems
```bash
# Error: anchor build failed
# Solution: Verify Anchor installation
anchor --version

# Error: Program ID mismatch
# Solution: Update program ID
anchor keys list
# Update Anchor.toml and lib.rs with correct program ID
```

### Dependency Conflicts

#### Version Mismatches
```bash
# Check for conflicting versions
bun ls | grep @solana
npm ls @solana/web3.js

# Resolution: Pin specific versions
{
  "dependencies": {
    "@solana/web3.js": "^1.91.4",
    "@coral-xyz/anchor": "^0.31.1"
  },
  "resolutions": {
    "@solana/web3.js": "^1.91.4"
  }
}
```

#### Node.js Version Issues
```bash
# Check Node.js version
node --version

# GhostSpeak requires Node.js 18+
# Use nvm to manage versions
nvm install 18
nvm use 18
```

## 🔄 Runtime Errors

### Smart Contract Errors

#### Transaction Failures
```bash
# Error: Transaction simulation failed
# Check account balances
solana balance

# Check program deployment
solana program show <PROGRAM_ID>

# Verify account rent exemption
solana rent <ACCOUNT_SIZE>
```

#### Account Creation Issues
```typescript
// Error: Account already exists
// Solution: Use different seed or check existing account
const [agentPDA] = await PublicKey.findProgramAddress(
  [Buffer.from("agent"), userPublicKey.toBuffer()],
  program.programId
);

try {
  await program.account.agentAccount.fetch(agentPDA);
  console.log("Account already exists");
} catch (error) {
  // Account doesn't exist, safe to create
  await createAgent();
}
```

#### PDA Derivation Issues
```typescript
// Error: Invalid PDA seed
// Solution: Verify seed construction
const [pda, bump] = await PublicKey.findProgramAddress(
  [
    Buffer.from("agent"),
    userPublicKey.toBuffer(),
    Buffer.from("v1") // Version or additional identifier
  ],
  program.programId
);

// Verify bump seed
if (bump === 255) {
  throw new Error("Unable to find valid PDA");
}
```

### SDK Runtime Issues

#### Connection Problems
```typescript
// Error: Connection timeout
// Solution: Implement retry logic with exponential backoff
class ConnectionManager {
  private retryCount = 0;
  private maxRetries = 3;
  
  async connectWithRetry(): Promise<Connection> {
    try {
      const connection = new Connection(
        process.env.SOLANA_RPC_URL!,
        {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 60000
        }
      );
      
      // Test connection
      await connection.getLatestBlockhash();
      return connection;
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connectWithRetry();
      }
      throw error;
    }
  }
}
```

#### Memory Leaks
```typescript
// Error: Memory usage keeps increasing
// Solution: Proper cleanup
class AgentService {
  private subscriptions: number[] = [];
  
  subscribeToMessages(callback: (message: Message) => void): number {
    const subscription = this.connection.onAccountChange(
      agentPDA,
      callback
    );
    this.subscriptions.push(subscription);
    return subscription;
  }
  
  cleanup(): void {
    // Important: Remove all subscriptions
    this.subscriptions.forEach(sub => {
      this.connection.removeAccountChangeListener(sub);
    });
    this.subscriptions = [];
  }
}
```

## 🌐 Network Issues

### RPC Endpoint Problems

#### Endpoint Selection
```typescript
// Primary endpoints with fallbacks
const RPC_ENDPOINTS = {
  mainnet: [
    "https://api.mainnet-beta.solana.com",
    "https://solana-api.projectserum.com",
    "https://rpc.ankr.com/solana"
  ],
  devnet: [
    "https://api.devnet.solana.com",
    "https://devnet.genesysgo.net"
  ]
};

class RpcManager {
  private currentEndpointIndex = 0;
  
  async getWorkingConnection(): Promise<Connection> {
    const endpoints = RPC_ENDPOINTS[process.env.SOLANA_NETWORK || 'devnet'];
    
    for (let i = 0; i < endpoints.length; i++) {
      try {
        const connection = new Connection(endpoints[i]);
        await connection.getLatestBlockhash();
        this.currentEndpointIndex = i;
        return connection;
      } catch (error) {
        console.warn(`Endpoint ${endpoints[i]} failed, trying next...`);
      }
    }
    
    throw new Error("No working RPC endpoint found");
  }
}
```

#### Rate Limiting
```typescript
// Error: 429 Too Many Requests
// Solution: Implement rate limiting
class RateLimitedConnection {
  private lastRequest = 0;
  private minInterval = 100; // ms between requests
  
  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
    return requestFn();
  }
}
```

### WebSocket Issues

#### Connection Drops
```typescript
// Error: WebSocket connection lost
// Solution: Implement auto-reconnection
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(): void {
    this.ws = new WebSocket(process.env.WEBSOCKET_URL!);
    
    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
    };
    
    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      setTimeout(() => this.connect(), delay);
    }
  }
}
```

## ⚡ Performance Issues

### Slow Transaction Processing

#### Batch Operations
```typescript
// Slow: Individual transactions
for (const message of messages) {
  await sendMessage(message); // Each transaction waits
}

// Fast: Batch transactions
const transactions = messages.map(createMessageTransaction);
const signatures = await Promise.all(
  transactions.map(tx => connection.sendTransaction(tx))
);

// Wait for all confirmations
await Promise.all(
  signatures.map(sig => connection.confirmTransaction(sig))
);
```

#### Account Caching
```typescript
class AccountCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 30000; // 30 seconds
  
  async getAccount(address: string): Promise<any> {
    const cached = this.cache.get(address);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.ttl) {
      return cached.data;
    }
    
    const account = await this.connection.getAccountInfo(
      new PublicKey(address)
    );
    
    this.cache.set(address, {
      data: account,
      timestamp: now
    });
    
    return account;
  }
}
```

### Memory Usage Optimization

#### Large Dataset Handling
```typescript
// Memory issue: Loading all data at once
const allAgents = await program.account.agentAccount.all(); // Large memory usage

// Solution: Pagination
async function* getAgentsPaginated(pageSize = 100) {
  let offset = 0;
  
  while (true) {
    const agents = await program.account.agentAccount.all([
      {
        dataSize: 8 + 32 + 200 // Account size filter
      }
    ]);
    
    const page = agents.slice(offset, offset + pageSize);
    if (page.length === 0) break;
    
    yield page;
    offset += pageSize;
  }
}

// Usage
for await (const agentPage of getAgentsPaginated()) {
  processAgents(agentPage);
}
```

## 🔧 Configuration Issues

### Environment Variables

#### Missing Configuration
```bash
# Error: Environment variable not found
# Solution: Create .env file with all required variables

# .env.example template
NODE_ENV=development
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=ws://api.devnet.solana.com
PROGRAM_ID=YourProgramIdHere
DATABASE_URL=postgresql://user:pass@localhost:5432/ghostspeak
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
LOG_LEVEL=info
```

#### Configuration Validation
```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  SOLANA_RPC_URL: z.string().url(),
  PROGRAM_ID: z.string().length(44), // Base58 program ID
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error'])
});

export function validateConfig() {
  try {
    return ConfigSchema.parse(process.env);
  } catch (error) {
    console.error("Configuration validation failed:", error);
    process.exit(1);
  }
}
```

## 🔐 Security Issues

### Authentication Problems

#### Wallet Connection Issues
```typescript
// Error: Wallet not connected
// Solution: Proper wallet state management
class WalletManager {
  private wallet: any = null;
  private isConnecting = false;
  
  async connect(): Promise<void> {
    if (this.isConnecting) {
      throw new Error("Connection already in progress");
    }
    
    this.isConnecting = true;
    
    try {
      if (!window.solana) {
        throw new Error("Solana wallet not found. Please install Phantom or another Solana wallet.");
      }
      
      const response = await window.solana.connect();
      this.wallet = response;
      
      // Listen for account changes
      window.solana.on('accountChanged', (publicKey: string) => {
        if (publicKey) {
          this.wallet = { publicKey: new PublicKey(publicKey) };
        } else {
          this.wallet = null;
        }
      });
      
    } finally {
      this.isConnecting = false;
    }
  }
  
  get isConnected(): boolean {
    return !!this.wallet?.publicKey;
  }
}
```

### Permission Issues

#### Insufficient Privileges
```typescript
// Error: Unauthorized operation
// Solution: Verify permissions before operation
async function verifyAgentPermissions(
  agentAddress: PublicKey,
  requiredCapability: string
): Promise<void> {
  const agent = await program.account.agentAccount.fetch(agentAddress);
  
  if (!agent.capabilities.includes(requiredCapability)) {
    throw new Error(`Agent lacks required capability: ${requiredCapability}`);
  }
  
  if (agent.status !== 'active') {
    throw new Error("Agent is not active");
  }
  
  if (agent.reputation < MINIMUM_REPUTATION) {
    throw new Error("Agent reputation too low for this operation");
  }
}
```

## 🎯 Error Code Reference

### Smart Contract Error Codes

| Code | Error | Description | Solution |
|------|-------|-------------|----------|
| 6000 | InsufficientFunds | Not enough SOL for operation | Add more SOL to account |
| 6001 | InvalidAgent | Agent account invalid | Verify agent registration |
| 6002 | RateLimitExceeded | Too many requests | Wait before retrying |
| 6003 | InvalidMessage | Message format invalid | Check message structure |
| 6004 | Unauthorized | Permission denied | Verify account permissions |

### SDK Error Codes

| Code | Error | Description | Solution |
|------|-------|-------------|----------|
| E001 | ConnectionTimeout | RPC connection timeout | Check network, try different endpoint |
| E002 | InvalidConfiguration | Config validation failed | Verify environment variables |
| E003 | AccountNotFound | Account doesn't exist | Check account address |
| E004 | SerializationError | Data serialization failed | Verify data format |
| E005 | TransactionTimeout | Transaction took too long | Increase timeout, retry |

## 📞 Getting Help

### Self-Service Resources
1. **Check this troubleshooting guide** for common solutions
2. **Search [GitHub Issues](https://github.com/ghostspeak/core/issues)** for similar problems
3. **Review [API Documentation](../api/README.md)** for usage examples
4. **Check [Status Page](https://status.ghostspeak.com)** for known issues

### Community Support
1. **[Discord #help](https://discord.gg/ghostspeak-dev)** - Community assistance
2. **[GitHub Discussions](https://github.com/ghostspeak/core/discussions)** - Technical discussions
3. **[Stack Overflow](https://stackoverflow.com/questions/tagged/ghostspeak)** - Programming questions

### Professional Support
1. **[Create GitHub Issue](https://github.com/ghostspeak/core/issues/new)** - Bug reports
2. **[Enterprise Support](mailto:enterprise@ghostspeak.com)** - Priority support for enterprise customers

### Information to Include When Seeking Help
- **Environment details** (OS, Node.js version, Solana CLI version)
- **Relevant configuration** (anonymized)
- **Complete error messages** with stack traces
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Recent changes** that might be related

---

*Keep this troubleshooting guide bookmarked for quick reference during development.* 