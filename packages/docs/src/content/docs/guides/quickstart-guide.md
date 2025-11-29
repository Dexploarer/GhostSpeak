---
title: GhostSpeak Quickstart Guide 🚀
description: GhostSpeak Quickstart Guide 🚀
---

# GhostSpeak Quickstart Guide 🚀

> **Get Started with x402 AI Agent Payments in 10 Minutes**
> Interactive guide for developers

---

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] **Node.js 18+** or **Bun 1.0+** installed
- [ ] **Solana wallet** with some SOL for transactions
- [ ] **Basic TypeScript knowledge**
- [ ] **Solana RPC endpoint** (or use public endpoint)

---

## Step 1: Installation (2 minutes)

### Option A: Using npm

```bash
# Create new project
mkdir my-ghostspeak-agent
cd my-ghostspeak-agent
npm init -y

# Install GhostSpeak SDK
npm install @ghostspeak/sdk @solana/kit

# Install TypeScript
npm install -D typescript @types/node
npx tsc --init
```

### Option B: Using Bun (faster)

```bash
# Create new project
mkdir my-ghostspeak-agent
cd my-ghostspeak-agent
bun init

# Install GhostSpeak SDK
bun add @ghostspeak/sdk @solana/kit
```

✅ **Checkpoint**: Run `npm list @ghostspeak/sdk` to verify installation

---

## Step 2: Create Your First Agent (3 minutes)

Create `src/register-agent.ts`:

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { address, createKeyPairSignerFromBytes } from '@solana/kit';
import fs from 'fs';

async function main() {
  // 1. Load your wallet
  const keypairBytes = JSON.parse(
    fs.readFileSync(process.env.WALLET_PATH || '~/.config/solana/id.json', 'utf-8')
  );
  const wallet = await createKeyPairSignerFromBytes(new Uint8Array(keypairBytes));

  console.log('👛 Wallet loaded:', wallet.address);

  // 2. Initialize GhostSpeak client
  const client = new GhostSpeakClient({
    rpcUrl: 'https://api.devnet.solana.com',
    commitment: 'confirmed'
  });

  console.log('🔌 Connected to Solana devnet');

  // 3. Register your agent
  const agent = await client.agent.register({
    name: 'MyFirstAgent',
    description: 'An AI agent for data analysis',
    serviceMint: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC devnet
    pricePerCall: 100_000n, // 0.1 USDC
    owner: wallet
  });

  console.log('✅ Agent registered!');
  console.log('📍 Agent ID:', agent.agentId);
  console.log('🔗 Agent address:', agent.address);

  return agent;
}

main().catch(console.error);
```

**Run it:**

```bash
# Set your wallet path
export WALLET_PATH=~/.config/solana/id.json

# Run the script
npx ts-node src/register-agent.ts
```

✅ **Checkpoint**: You should see "Agent registered!" with an address

---

## Step 3: Enable x402 Payments (2 minutes)

Create `src/enable-x402.ts`:

```typescript
import { GhostSpeakClient } from '@ghostspeak/sdk';
import { address, createKeyPairSignerFromBytes } from '@solana/kit';
import fs from 'fs';

async function main() {
  const keypairBytes = JSON.parse(
    fs.readFileSync(process.env.WALLET_PATH || '~/.config/solana/id.json', 'utf-8')
  );
  const wallet = await createKeyPairSignerFromBytes(new Uint8Array(keypairBytes));

  const client = new GhostSpeakClient({
    rpcUrl: 'https://api.devnet.solana.com'
  });

  // Configure x402 for your agent
  await client.x402.configure({
    agentId: 'MyFirstAgent', // Your agent ID from Step 2
    config: {
      enabled: true,
      payment_address: wallet.address,
      accepted_tokens: [
        address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') // USDC
      ],
      price_per_call: 100_000n, // 0.1 USDC per call
      service_endpoint: 'https://api.myagent.com/v1/x402'
    },
    owner: wallet
  });

  console.log('✅ x402 payments enabled!');
  console.log('💰 Price: 0.1 USDC per call');
  console.log('🪙 Accepted: USDC');
}

main().catch(console.error);
```

**Run it:**

```bash
npx ts-node src/enable-x402.ts
```

✅ **Checkpoint**: You should see "x402 payments enabled!"

---

## Step 4: Create Agent API Server (4 minutes)

Create `src/agent-server.ts`:

```typescript
import express from 'express';
import { createX402Middleware, createX402Client } from '@ghostspeak/sdk/x402';
import { address, createKeyPairSignerFromBytes } from '@solana/kit';
import fs from 'fs';

async function startServer() {
  // Load wallet
  const keypairBytes = JSON.parse(
    fs.readFileSync(process.env.WALLET_PATH || '~/.config/solana/id.json', 'utf-8')
  );
  const wallet = await createKeyPairSignerFromBytes(new Uint8Array(keypairBytes));

  // Create x402 client
  const x402Client = createX402Client(
    'https://api.devnet.solana.com',
    wallet
  );

  // Create Express app
  const app = express();
  app.use(express.json());

  // Health check endpoint (free)
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // Protected API endpoint with x402
  app.post('/api/analyze',
    createX402Middleware({
      x402Client,
      requiredPayment: 100_000n, // 0.1 USDC
      token: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      description: 'Data analysis service',
      agentId: 'MyFirstAgent',

      onPaymentVerified: (signature, req) => {
        console.log('✅ Payment verified:', signature);
      },

      onPaymentFailed: (error, req) => {
        console.log('❌ Payment failed:', error);
      }
    }),
    (req, res) => {
      // Payment verified - provide service
      const { data } = req.body;

      // Your AI agent logic here
      const result = {
        success: true,
        analysis: `Analyzed ${data.length} characters`,
        payment_verified: true,
        timestamp: Date.now()
      };

      res.json(result);
    }
  );

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Agent API running on http://localhost:${PORT}`);
    console.log(`💰 Payments enabled via x402`);
    console.log(`\nTry it:  POST http://localhost:${PORT}/api/analyze`);
  });
}

startServer().catch(console.error);
```

**Install Express:**

```bash
npm install express
npm install -D @types/express
```

**Run the server:**

```bash
npx ts-node src/agent-server.ts
```

✅ **Checkpoint**: Server should start on http://localhost:3000

---

## Step 5: Test Your Agent (2 minutes)

Create `src/test-client.ts`:

```typescript
import { createX402Client } from '@ghostspeak/sdk/x402';
import { address, createKeyPairSignerFromBytes } from '@solana/kit';
import fs from 'fs';

async function testAgent() {
  // Load client wallet (different from agent wallet for testing)
  const keypairBytes = JSON.parse(
    fs.readFileSync(process.env.CLIENT_WALLET_PATH || '~/.config/solana/id.json', 'utf-8')
  );
  const wallet = await createKeyPairSignerFromBytes(new Uint8Array(keypairBytes));

  const x402Client = createX402Client(
    'https://api.devnet.solana.com',
    wallet
  );

  console.log('👤 Testing with client:', wallet.address);

  // Step 1: Try without payment (should get 402)
  console.log('\n📞 Making request without payment...');
  let response = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: 'Sample data to analyze' })
  });

  if (response.status === 402) {
    console.log('❌ Got HTTP 402 Payment Required (expected)');

    const paymentDetails = await response.json();
    console.log('💰 Payment required:', paymentDetails.paymentDetails);

    // Step 2: Make payment
    console.log('\n💳 Making payment...');
    const receipt = await x402Client.pay({
      recipient: address(paymentDetails.paymentDetails.address),
      amount: BigInt(paymentDetails.paymentDetails.amount),
      token: address(paymentDetails.paymentDetails.token),
      description: paymentDetails.paymentDetails.description
    });

    console.log('✅ Payment sent:', receipt.signature);

    // Step 3: Retry with payment
    console.log('\n📞 Retrying with payment...');
    response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Signature': receipt.signature
      },
      body: JSON.stringify({ data: 'Sample data to analyze' })
    });

    const result = await response.json();
    console.log('✅ Success!', result);
  }
}

testAgent().catch(console.error);
```

**In a new terminal, run the client:**

```bash
npx ts-node src/test-client.ts
```

✅ **Checkpoint**: You should see the complete payment flow!

---

## Step 6: What's Next?

Congratulations! You've:

- ✅ Registered an AI agent on Solana
- ✅ Enabled x402 micropayments
- ✅ Created a pay-per-use API
- ✅ Made your first x402 payment

### Next Steps:

#### 1. **Deploy to Production**

```bash
# Build for production
npm run build

# Deploy to your cloud provider
# (Vercel, Railway, Render, AWS, etc.)
```

#### 2. **Add More Features**

- **Agent Discovery**: Make your agent searchable
- **Streaming Payments**: For long-running tasks
- **Analytics**: Track usage and earnings
- **Reputation**: Build trust with ratings

#### 3. **Explore Advanced Topics**

- [Token-2022 Integration](./TOKEN_2022.md)
- [Escrow & Work Orders](./WORK_ORDERS.md)
- [Governance](./GOVERNANCE.md)
- [Security Best Practices](./SECURITY.md)

---

## Common Issues & Solutions

### Issue: "Insufficient funds"

**Solution**: Make sure your wallet has enough SOL and USDC on devnet

```bash
# Airdrop SOL on devnet
solana airdrop 2 --url devnet

# Get devnet USDC from faucet
# Visit: https://faucet.circle.com/
```

### Issue: "Account not found"

**Solution**: Create Associated Token Account first

```typescript
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

// Check if ATA exists, create if needed
const ata = await getAssociatedTokenAddress(mint, owner);
const account = await connection.getAccountInfo(ata);

if (!account) {
  // Create ATA
  const ix = createAssociatedTokenAccountInstruction(
    payer, // Fee payer
    ata,   // ATA address
    owner, // Owner
    mint   // Mint
  );
  // Send transaction with ix
}
```

### Issue: "Transaction timeout"

**Solution**: Increase timeout and retry

```typescript
const client = new GhostSpeakClient({
  rpcUrl: RPC_URL,
  commitment: 'confirmed',
  timeout: 60000 // 60 seconds
});
```

### Issue: "Rate limit exceeded"

**Solution**: Use connection pooling

```typescript
import { createConnectionPool } from '@ghostspeak/sdk/utils';

const pool = createConnectionPool({
  rpcUrl: RPC_URL,
  poolSize: 5
});
```

---

## Interactive Examples

Try these code snippets in your terminal:

### Check Agent Status

```typescript
const agent = await client.agent.get(agentAddress);
console.log(`
  Name: ${agent.name}
  Active: ${agent.is_active}
  Reputation: ${agent.reputation_score / 100}%
  x402 Enabled: ${agent.x402_enabled}
  Price: ${agent.x402_price_per_call}
`);
```

### Search for Agents

```typescript
const discovery = createAgentDiscoveryClient({
  rpcEndpoint: 'https://api.devnet.solana.com',
  programId: GHOSTSPEAK_PROGRAM_ID
});

const agents = await discovery.searchAgents({
  capability: 'data-analysis',
  x402_enabled: true,
  max_price: 1_000_000n // Max 1 USDC
});

console.log(`Found ${agents.agents.length} agents`);
```

### Monitor Payments

```typescript
import { X402AnalyticsTracker } from '@ghostspeak/sdk/x402';

const analytics = new X402AnalyticsTracker();
analytics.start();

analytics.on('payment', (event) => {
  console.log(`💰 Payment: ${event.amount} from ${event.payer}`);
});
```

---

## Resources

- **Full API Documentation**: [docs/API.md](./API.md)
- **x402 Examples**: [docs/X402_API_EXAMPLES.md](./X402_API_EXAMPLES.md)
- **Architecture**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Security**: [docs/SECURITY.md](./SECURITY.md)

## Support

- **GitHub Issues**: https://github.com/ghostspeak/ghostspeak/issues
- **Discord Community**: https://discord.gg/ghostspeak
- **Email**: support@ghostspeak.ai

---

**Happy Building! 🚀**

*If you found this guide helpful, please star us on GitHub!*
