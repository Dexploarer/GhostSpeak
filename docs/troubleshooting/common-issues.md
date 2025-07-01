# Common Issues & Solutions

Quick solutions for the most frequently encountered podAI development issues.

## Build & Setup Issues

### Solana CLI Issues

#### `solana: command not found`
```bash
# Add Solana CLI to PATH
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
solana --version
```

#### `anchor: command not found`
```bash
# Install AVM and Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.31.1
avm use 0.31.1
anchor --version
```

#### `anchor build` fails
```bash
# Clean and rebuild
anchor clean
rm -rf target/ .anchor/
anchor build

# Check Rust version (need 1.79.0+)
rustup update
```

### Node.js/Bun Issues

#### `Cannot find module '@solana/web3.js'`
```bash
# Clear cache and reinstall
bun pm cache rm
rm -rf node_modules bun.lockb
bun install
```

#### Memory issues
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=8192"
```

## Runtime Issues

### Connection Issues

#### Network timeouts
```typescript
const connection = new Connection(rpcUrl, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  disableRetryOnRateLimit: false,
});

// Implement retry logic
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### Rate limiting (429 errors)
```typescript
// Add request throttling
class RateLimiter {
  private lastRequest = 0;
  private minInterval = 200;

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }
}
```

### Transaction Issues

#### `Insufficient funds`
```bash
# Check balance and get more SOL
solana balance
solana airdrop 2
```

#### `Transaction simulation failed`
```typescript
// Debug transaction simulation
const simulation = await connection.simulateTransaction(transaction, {
  sigVerify: false,
  commitment: 'confirmed',
});

if (simulation.value.err) {
  console.error('Simulation error:', simulation.value.err);
  console.error('Logs:', simulation.value.logs);
}
```

#### `Blockhash not found`
```typescript
// Use fresh blockhash
async function sendTransactionWithRetry(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[]
): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.sign(...signers);
  
  return await connection.sendRawTransaction(transaction.serialize());
}
```

### Account Issues

#### `AccountNotFound`
```typescript
// Verify PDA derivation
const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("agent"), authority.toBuffer()],
  programId
);

// Check if account exists
const account = await connection.getAccountInfo(pda);
if (!account) {
  throw new Error(`Account not found: ${pda.toBase58()}`);
}
```

#### Program ID mismatch
```typescript
// Verify program deployment
const programId = new PublicKey('HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps');
const programAccount = await connection.getAccountInfo(programId);

if (!programAccount?.executable) {
  throw new Error(`Program not deployed: ${programId.toBase58()}`);
}
```

## SDK Integration Issues

### TypeScript Issues

#### Import errors
```typescript
// ✅ Correct imports
import { AgentService, MessageService } from '@podai/sdk-typescript';

// Check tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

#### Type errors
```typescript
// Use proper type annotations
const messageData: MessageData = {
  content: "Hello",
  messageType: MessageType.Text,
  priority: Priority.Normal,
  contentHash: computeHash("Hello"),
  // ... other required fields
};
```

### Wallet Issues

#### Connection failures
```typescript
class WalletManager {
  async connect(): Promise<Wallet> {
    if (typeof window !== 'undefined' && window.solana) {
      const response = await window.solana.connect();
      return new Wallet(response.publicKey);
    } else {
      // Node.js fallback
      const keypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(process.env.PRIVATE_KEY!))
      );
      return new Wallet(keypair);
    }
  }
}
```

## Performance Issues

### Slow transactions
```typescript
// Use faster commitment levels
const connection = new Connection(rpcUrl, 'processed');

// Batch operations
async function batchOperations<T>(
  operations: (() => Promise<T>)[],
  batchSize = 10
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
    
    // Rate limiting between batches
    if (i + batchSize < operations.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
```

### High RPC costs
```typescript
// Implement caching
class CachedConnection {
  private cache = new Map<string, { data: any; expiry: number }>();
  
  async getAccountInfo(pubkey: PublicKey, ttl = 30000) {
    const key = pubkey.toBase58();
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    
    const data = await this.connection.getAccountInfo(pubkey);
    this.cache.set(key, { data, expiry: Date.now() + ttl });
    
    return data;
  }
}
```

## Debugging Tools

### Diagnostic commands
```bash
# System info
echo "Node: $(node --version)"
echo "Bun: $(bun --version)"
echo "Rust: $(rustc --version)"
echo "Solana: $(solana --version)"
echo "Anchor: $(anchor --version)"

# Network info
solana config get
solana cluster-version
```

### Error logging
```typescript
// Enhanced error logging
function logError(error: any, context: string): void {
  console.error(`[${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
  });
}

// Transaction logging
async function logTransaction(signature: string): Promise<void> {
  const tx = await connection.getTransaction(signature);
  console.log('Transaction:', {
    signature,
    slot: tx?.slot,
    blockTime: tx?.blockTime,
    meta: tx?.meta,
  });
}
```

## Getting Help

### Before reporting issues
1. Check this troubleshooting guide
2. Search [existing issues](https://github.com/Prompt-or-Die/ghostspeak/issues)
3. Review [FAQ](../resources/faq.md)

### When reporting bugs, include:
- Error messages and stack traces
- System information (versions)
- Steps to reproduce
- Expected vs actual behavior

### Support channels
- [GitHub Issues](https://github.com/Prompt-or-Die/ghostspeak/issues)
- [Community Discord](../resources/community.md)
- [Documentation FAQ](../resources/faq.md)

---

**Need more help?** Check our [detailed error reference](./error-messages.md) or [performance troubleshooting](./performance.md) guides. 