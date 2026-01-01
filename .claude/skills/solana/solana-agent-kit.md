# Solana Agent Kit Reference

Complete guide for building AI agents on Solana with SendAI's toolkit (December 2025).

## Overview

Solana Agent Kit V2 is a plugin-based toolkit connecting AI agents to 60+ Solana protocols. It supports Vercel AI SDK, LangChain, OpenAI function calling, and MCP.

## Installation

```bash
# Core package
pnpm add solana-agent-kit

# Individual plugins
pnpm add @solana-agent-kit/plugin-token
pnpm add @solana-agent-kit/plugin-nft
pnpm add @solana-agent-kit/plugin-defi
pnpm add @solana-agent-kit/plugin-misc
pnpm add @solana-agent-kit/plugin-blinks

# AI framework adapters
pnpm add @solana-agent-kit/adapter-vercel-ai
pnpm add @solana-agent-kit/adapter-langchain
pnpm add @solana-agent-kit/adapter-mcp
```

---

## Core Architecture

### SolanaAgentKit Class

The central orchestrator managing plugins, wallet, and actions.

```typescript
import { 
  SolanaAgentKit, 
  KeypairWallet,
  createVercelAITools,
  createLangchainTools,
  createOpenAITools,
} from 'solana-agent-kit';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Create wallet
const keypair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));
const wallet = new KeypairWallet(keypair);

// Initialize agent
const agent = new SolanaAgentKit(
  wallet,
  process.env.RPC_URL!,
  {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    // Optional: other API keys for integrations
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    JUPITER_API_KEY: process.env.JUPITER_API_KEY,
  }
);
```

### Wallet Interfaces

```typescript
// BaseWallet interface
interface BaseWallet {
  publicKey: PublicKey;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
}

// KeypairWallet - for server-side
import { KeypairWallet } from 'solana-agent-kit';
const wallet = new KeypairWallet(keypair);

// Embedded wallets (Privy, Turnkey, etc.)
import { PrivyWallet, TurnkeyWallet } from 'solana-agent-kit';
```

---

## Plugin System

### Registering Plugins

```typescript
import TokenPlugin from '@solana-agent-kit/plugin-token';
import NFTPlugin from '@solana-agent-kit/plugin-nft';
import DefiPlugin from '@solana-agent-kit/plugin-defi';
import MiscPlugin from '@solana-agent-kit/plugin-misc';
import BlinksPlugin from '@solana-agent-kit/plugin-blinks';

// Chain plugin registration
const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(TokenPlugin)
  .use(NFTPlugin)
  .use(DefiPlugin)
  .use(MiscPlugin)
  .use(BlinksPlugin);

// Access plugin methods directly
const balance = await agent.methods.getBalance(tokenMint);
const quote = await agent.methods.getSwapQuote(inputMint, outputMint, amount);

// Get all registered actions
const allActions = agent.actions; // Action[]
```

### Plugin Interface

```typescript
interface Plugin {
  name: string;
  methods: Record<string, Function>;
  actions: Action[];
  initialize(agent: SolanaAgentKit): void;
}

interface Action {
  name: string;
  similes: string[];         // Alternative names for matching
  description: string;        // For AI context
  examples: Example[];        // Few-shot examples
  schema: ZodSchema;          // Input validation
  handler: (agent: SolanaAgentKit, input: any) => Promise<any>;
}
```

---

## Token Plugin

SPL token operations including transfers, swaps, and deployments.

### Available Actions

| Action | Description |
|--------|-------------|
| `transfer` | Transfer SPL tokens |
| `getBalance` | Get token balance |
| `deployToken` | Deploy new SPL token |
| `swap` | Swap via Jupiter |
| `bridge` | Cross-chain via Wormhole |
| `rugCheck` | Check token safety |
| `getTokenInfo` | Get token metadata |

### Usage

```typescript
import TokenPlugin from '@solana-agent-kit/plugin-token';

const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(TokenPlugin);

// Direct method calls
const balance = await agent.methods.getBalance(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC mint
);

const txSig = await agent.methods.transfer({
  to: recipientAddress,
  amount: 100,
  mint: usdcMint,
});

// Deploy new token
const { mint, signature } = await agent.methods.deployToken({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 9,
  initialSupply: 1_000_000,
  uri: 'https://example.com/metadata.json',
});

// Swap via Jupiter
const swapResult = await agent.methods.swap({
  inputMint: 'So11111111111111111111111111111111111111112', // SOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: 1_000_000_000, // 1 SOL in lamports
  slippageBps: 50, // 0.5%
});

// Rug check
const rugCheck = await agent.methods.rugCheck(tokenMint);
// Returns safety score, holder distribution, liquidity info
```

---

## NFT Plugin

Metaplex NFT operations including minting and marketplace interactions.

### Available Actions

| Action | Description |
|--------|-------------|
| `deployCollection` | Create NFT collection |
| `mintNFT` | Mint to collection |
| `mintCompressedNFT` | Mint cNFT (Bubblegum) |
| `listNFT` | List on marketplace |
| `buyNFT` | Purchase listed NFT |
| `updateMetadata` | Update NFT metadata |

### Usage

```typescript
import NFTPlugin from '@solana-agent-kit/plugin-nft';

const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(NFTPlugin);

// Deploy collection
const { collectionMint } = await agent.methods.deployCollection({
  name: 'My Collection',
  symbol: 'MYCOL',
  uri: 'https://example.com/collection.json',
});

// Mint NFT to collection
const { mint, signature } = await agent.methods.mintNFT({
  name: 'My NFT #1',
  uri: 'https://example.com/nft/1.json',
  collection: collectionMint,
  sellerFeeBasisPoints: 500, // 5% royalty
});

// Mint compressed NFT (much cheaper)
const { assetId } = await agent.methods.mintCompressedNFT({
  name: 'My cNFT #1',
  uri: 'https://example.com/cnft/1.json',
  collection: collectionMint,
  merkleTree: treeAddress, // Pre-created tree
});

// List on marketplace (Tensor/Magic Eden)
await agent.methods.listNFT({
  mint: nftMint,
  price: 1.5, // SOL
  marketplace: 'tensor',
});
```

---

## DeFi Plugin

DeFi operations across major Solana protocols.

### Available Actions

| Action | Description |
|--------|-------------|
| `jupiterSwap` | Swap via Jupiter aggregator |
| `raydiumCreatePool` | Create Raydium AMM pool |
| `raydiumAddLiquidity` | Add liquidity |
| `orcaSwap` | Swap on Orca Whirlpool |
| `lend` | Lend on lending protocols |
| `borrow` | Borrow from protocols |
| `stake` | Stake SOL/tokens |
| `unstake` | Unstake |

### Usage

```typescript
import DefiPlugin from '@solana-agent-kit/plugin-defi';

const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(DefiPlugin);

// Jupiter swap with best route
const swapResult = await agent.methods.jupiterSwap({
  inputMint: solMint,
  outputMint: usdcMint,
  amount: 1e9, // 1 SOL
  slippageBps: 50,
});

// Create Raydium pool
const { poolId, txSig } = await agent.methods.raydiumCreatePool({
  baseMint: tokenAMint,
  quoteMint: tokenBMint,
  baseAmount: 1000,
  quoteAmount: 1000,
});

// Add liquidity
await agent.methods.raydiumAddLiquidity({
  poolId,
  baseAmount: 100,
  quoteAmount: 100,
  slippage: 1, // 1%
});

// Stake SOL
await agent.methods.stake({
  amount: 10, // SOL
  validator: validatorAddress,
});
```

---

## Misc Plugin

Utility functions and external integrations.

### Available Actions

| Action | Description |
|--------|-------------|
| `requestAirdrop` | Devnet SOL airdrop |
| `getPythPrice` | Pyth oracle price |
| `getCoinGeckoInfo` | Token info from CoinGecko |
| `registerDomain` | SNS domain registration |
| `resolveDomain` | Resolve .sol domain |
| `getHeliusAssets` | Fetch NFTs via Helius DAS |

### Usage

```typescript
import MiscPlugin from '@solana-agent-kit/plugin-misc';

const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(MiscPlugin);

// Request devnet airdrop
await agent.methods.requestAirdrop(2); // 2 SOL

// Get Pyth price
const solPrice = await agent.methods.getPythPrice('SOL/USD');
// { price: 150.23, confidence: 0.05, ... }

// CoinGecko token info
const tokenInfo = await agent.methods.getCoinGeckoInfo(tokenMint);
// { name, symbol, price, marketCap, volume24h, ... }

// Register .sol domain
await agent.methods.registerDomain('myname.sol');

// Resolve domain to address
const address = await agent.methods.resolveDomain('toly.sol');

// Get all NFTs owned by address (Helius DAS)
const assets = await agent.methods.getHeliusAssets(walletAddress);
```

---

## Blinks Plugin

Solana Actions (Blinks) for interactive blockchain operations.

```typescript
import BlinksPlugin from '@solana-agent-kit/plugin-blinks';

const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(BlinksPlugin);

// Execute Blink action
await agent.methods.executeBlink({
  url: 'https://dial.to/?action=solana-action:...',
  params: { amount: 100 },
});

// Lulo lending via Blinks
await agent.methods.luloLend({ amount: 100, asset: 'USDC' });

// JupSOL staking
await agent.methods.stakeJupSOL({ amount: 10 });
```

---

## AI Framework Integration

### Vercel AI SDK

```typescript
import { createVercelAITools } from 'solana-agent-kit';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(TokenPlugin)
  .use(DefiPlugin);

// Create Vercel AI compatible tools
const tools = createVercelAITools(agent, agent.actions);

// Use with Vercel AI SDK
const response = await generateText({
  model: openai('gpt-4o'),
  tools,
  prompt: 'Swap 1 SOL to USDC using Jupiter',
  maxSteps: 5,
});
```

### LangChain

```typescript
import { createLangchainTools } from 'solana-agent-kit';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';

const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(TokenPlugin);

// Create LangChain tools (DynamicStructuredTool[])
const tools = createLangchainTools(agent, agent.actions);

// Create LangChain agent
const llm = new ChatOpenAI({ model: 'gpt-4o' });
const langchainAgent = await createOpenAIFunctionsAgent({
  llm,
  tools,
  prompt: yourPromptTemplate,
});

const executor = new AgentExecutor({
  agent: langchainAgent,
  tools,
});

const result = await executor.invoke({
  input: 'Check my SOL balance and swap half to USDC',
});
```

### OpenAI Function Calling

```typescript
import { createOpenAITools } from 'solana-agent-kit';
import OpenAI from 'openai';

const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(TokenPlugin);

// Create OpenAI compatible tools
const tools = createOpenAITools(agent, agent.actions);

const openai = new OpenAI();

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Get my USDC balance' }],
  tools,
  tool_choice: 'auto',
});

// Handle tool calls
if (response.choices[0].message.tool_calls) {
  for (const toolCall of response.choices[0].message.tool_calls) {
    const action = agent.actions.find(a => a.name === toolCall.function.name);
    if (action) {
      const input = JSON.parse(toolCall.function.arguments);
      const result = await action.handler(agent, input);
      // Continue conversation with result
    }
  }
}
```

### MCP (Model Context Protocol)

```typescript
import { startMcpServer } from '@solana-agent-kit/adapter-mcp';

const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(TokenPlugin)
  .use(DefiPlugin);

// Start MCP server
startMcpServer(agent, {
  // Optionally filter actions
  actions: agent.actions.filter(a => 
    ['getBalance', 'transfer', 'swap'].includes(a.name)
  ),
  port: 3001,
});

// MCP server now exposes tools via stdio or HTTP
// Can be used with Claude Desktop, VS Code, etc.
```

---

## Creating Custom Plugins

```typescript
import { Plugin, Action, SolanaAgentKit } from 'solana-agent-kit';
import { z } from 'zod';

const MyCustomPlugin: Plugin = {
  name: 'my-custom-plugin',
  
  methods: {
    async myCustomMethod(this: SolanaAgentKit, param: string) {
      // Access wallet: this.wallet
      // Access RPC: this.connection
      return `Processed: ${param}`;
    },
  },
  
  actions: [
    {
      name: 'myCustomAction',
      similes: ['do custom thing', 'custom operation'],
      description: 'Performs a custom blockchain operation',
      examples: [
        {
          input: { data: 'example' },
          output: { success: true, result: 'Processed: example' },
          explanation: 'Process the data and return result',
        },
      ],
      schema: z.object({
        data: z.string().describe('Data to process'),
      }),
      handler: async (agent: SolanaAgentKit, input: { data: string }) => {
        return agent.methods.myCustomMethod(input.data);
      },
    },
  ],
  
  initialize(agent: SolanaAgentKit) {
    // Setup code when plugin is registered
    console.log('Custom plugin initialized');
  },
};

// Use custom plugin
const agent = new SolanaAgentKit(wallet, rpcUrl, config)
  .use(MyCustomPlugin);
```

---

## Next.js API Route Example

```typescript
// app/api/chat/route.ts
import { SolanaAgentKit, createVercelAITools, KeypairWallet } from 'solana-agent-kit';
import TokenPlugin from '@solana-agent-kit/plugin-token';
import DefiPlugin from '@solana-agent-kit/plugin-defi';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  // Initialize agent (consider caching in production)
  const keypair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));
  const wallet = new KeypairWallet(keypair);
  
  const agent = new SolanaAgentKit(
    wallet,
    process.env.RPC_URL!,
    { OPENAI_API_KEY: process.env.OPENAI_API_KEY }
  )
    .use(TokenPlugin)
    .use(DefiPlugin);
  
  const tools = createVercelAITools(agent, agent.actions);
  
  const result = await streamText({
    model: openai('gpt-4o'),
    system: `You are a Solana blockchain assistant. Help users with:
- Checking balances
- Transferring tokens
- Swapping via Jupiter
- DeFi operations

Always confirm before executing transactions.`,
    messages,
    tools,
    maxSteps: 10,
  });
  
  return result.toDataStreamResponse();
}
```

---

## Best Practices

### Security

1. **Never expose private keys** - Use environment variables
2. **Validate all inputs** - Actions use Zod schemas
3. **Require confirmation** - For value transfers
4. **Use dedicated wallets** - Don't use main wallet for agents
5. **Set spending limits** - Implement transaction limits

### Performance

1. **Cache agent instance** - Don't recreate per request
2. **Use appropriate RPC** - Helius/Triton for production
3. **Batch operations** - Combine related actions
4. **Handle rate limits** - Implement retry logic

### AI Integration

1. **Provide clear descriptions** - Help AI understand actions
2. **Include examples** - Few-shot learning improves accuracy
3. **Use similes** - Alternative names for natural language matching
4. **Limit tool scope** - Only expose needed actions
5. **Log all operations** - Audit trail for debugging

---

## Troubleshooting

### Common Issues

```typescript
// Private key format
// Must be base58 encoded
const keypair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

// RPC rate limits
// Use paid RPC for production
const agent = new SolanaAgentKit(wallet, 'https://your-helius-rpc.com', config);

// Transaction failures
// Check balance, priority fees, and simulation
const balance = await agent.methods.getBalance('So11111111111111111111111111111111111111112');
if (balance < requiredAmount) {
  throw new Error('Insufficient balance');
}
```

---

## References

- [Solana Agent Kit Docs](https://docs.sendai.fun/)
- [SendAI GitHub](https://github.com/sendaifun/solana-agent-kit)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [LangChain JS](https://js.langchain.com/)
