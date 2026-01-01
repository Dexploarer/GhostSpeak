# Solana DeFi Integration Reference

Complete guide for integrating Jupiter, Pump.fun, Raydium, and other DeFi protocols (December 2025).

## Protocol Overview

| Protocol | Type | Primary Use |
|----------|------|-------------|
| Jupiter | DEX Aggregator | Best-price swaps |
| Pump.fun | Bonding Curve | Meme token launches |
| PumpSwap | AMM | Zero-fee trading |
| Raydium | AMM/CLMM | Liquidity pools |
| Orca | Concentrated Liquidity | Whirlpools |
| Meteora | Dynamic Pools | Yield optimization |

---

## Jupiter V6 Swap API

Jupiter aggregates 30+ DEXes for optimal swap routing.

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/quote` | GET | Get swap quote |
| `/swap` | POST | Build swap transaction |
| `/swap-instructions` | POST | Get instructions only |
| `/price` | GET | Token prices |

### Get Quote

```typescript
const JUPITER_API = 'https://api.jup.ag/swap/v1';

interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string;           // In base units (lamports)
  slippageBps?: number;     // Default 50 (0.5%)
  swapMode?: 'ExactIn' | 'ExactOut';
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
  maxAccounts?: number;
  restrictIntermediateTokens?: boolean;
}

async function getQuote(params: QuoteParams) {
  const queryString = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: (params.slippageBps ?? 50).toString(),
    restrictIntermediateTokens: 'true', // Recommended for stability
  }).toString();
  
  const response = await fetch(`${JUPITER_API}/quote?${queryString}`, {
    headers: { 'x-api-key': process.env.JUPITER_API_KEY },
  });
  
  return response.json();
}

// Example: 1 SOL to USDC
const quote = await getQuote({
  inputMint: 'So11111111111111111111111111111111111111112',  // SOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: '1000000000', // 1 SOL = 1e9 lamports
  slippageBps: 50,
});

// Quote response
{
  inputMint: 'So11111111111111111111111111111111111111112',
  inAmount: '1000000000',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  outAmount: '161987530', // USDC has 6 decimals
  otherAmountThreshold: '161177592', // Min received after slippage
  swapMode: 'ExactIn',
  slippageBps: 50,
  priceImpactPct: '0.001',
  routePlan: [...], // Routing details
}
```

### Build Swap Transaction

```typescript
interface SwapParams {
  quoteResponse: QuoteResponse;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  dynamicComputeUnitLimit?: boolean;
  dynamicSlippage?: boolean;
  prioritizationFeeLamports?: number | 'auto';
  asLegacyTransaction?: boolean;
  feeAccount?: string; // For platform fees
}

async function getSwapTransaction(params: SwapParams) {
  const response = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.JUPITER_API_KEY,
    },
    body: JSON.stringify({
      quoteResponse: params.quoteResponse,
      userPublicKey: params.userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });
  
  return response.json();
}

// Execute swap
const swapResult = await getSwapTransaction({
  quoteResponse: quote,
  userPublicKey: wallet.publicKey.toString(),
});

// Deserialize and sign
const swapTransaction = VersionedTransaction.deserialize(
  Buffer.from(swapResult.swapTransaction, 'base64')
);
swapTransaction.sign([wallet]);

// Send
const signature = await connection.sendRawTransaction(
  swapTransaction.serialize(),
  { skipPreflight: true, maxRetries: 3 }
);
```

### Get Swap Instructions (Composable)

```typescript
// For composing with other instructions
const instructionsResponse = await fetch(`${JUPITER_API}/swap-instructions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quoteResponse: quote,
    userPublicKey: wallet.publicKey.toString(),
  }),
});

const {
  computeBudgetInstructions,
  setupInstructions,
  swapInstruction,
  cleanupInstruction,
  addressLookupTableAddresses,
} = await instructionsResponse.json();

// Compose with your own instructions
const instructions = [
  ...computeBudgetInstructions.map(deserializeInstruction),
  ...setupInstructions.map(deserializeInstruction),
  yourCustomInstruction,
  deserializeInstruction(swapInstruction),
  yourCleanupInstruction,
  deserializeInstruction(cleanupInstruction),
];
```

### Platform Fees

```typescript
// Add platformFeeBps to quote
const quote = await getQuote({
  // ... other params
  platformFeeBps: 100, // 1% platform fee
});

// Include feeAccount in swap
const swap = await getSwapTransaction({
  quoteResponse: quote,
  userPublicKey: wallet.publicKey.toString(),
  feeAccount: yourFeeAccountAddress, // Token account for the output mint
});
```

---

## Pump.fun Integration

Bonding curve token launches with automatic Raydium migration.

### How Pump.fun Works

1. **Launch** - Create token with bonding curve (~$2 entry)
2. **Trade** - Buy/sell on bonding curve (price increases with supply)
3. **Graduate** - At ~$69k market cap, liquidity migrates to Raydium
4. **Post-migration** - Trade on Raydium/Jupiter

### Check Token Status

```typescript
// Check if token is on bonding curve or migrated
async function checkTokenStatus(mint: string) {
  // Option 1: Check Pump.fun API
  const response = await fetch(
    `https://frontend-api.pump.fun/coins/${mint}`
  );
  const data = await response.json();
  
  return {
    isOnBondingCurve: !data.raydium_pool,
    bondingCurveProgress: data.usd_market_cap / 69000, // ~69k to graduate
    raydiumPool: data.raydium_pool,
  };
}

// Option 2: Check on-chain
async function isOnRaydium(mint: string): Promise<boolean> {
  // Look for Raydium pool account
  const poolAccounts = await connection.getProgramAccounts(
    RAYDIUM_AMM_PROGRAM,
    {
      filters: [
        { memcmp: { offset: 400, bytes: mint } }, // Token mint position
      ],
    }
  );
  return poolAccounts.length > 0;
}
```

### Buy on Bonding Curve

```typescript
import { 
  Connection, 
  PublicKey, 
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

const PUMP_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

interface PumpBuyParams {
  mint: string;
  solAmount: number;
  slippageBps: number;
}

async function buildPumpFunBuyTransaction(params: PumpBuyParams) {
  // Get bonding curve data
  const bondingCurve = await getBondingCurveAccount(params.mint);
  
  // Calculate token amount from bonding curve
  const tokenAmount = calculateTokensFromSol(
    params.solAmount,
    bondingCurve.virtualSolReserves,
    bondingCurve.virtualTokenReserves
  );
  
  // Apply slippage
  const minTokens = tokenAmount * (1 - params.slippageBps / 10000);
  
  // Build instruction
  const instruction = {
    programId: PUMP_PROGRAM,
    keys: [
      { pubkey: bondingCurve.address, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(params.mint), isSigner: false, isWritable: false },
      // ... other accounts
    ],
    data: Buffer.from([
      /* buy instruction discriminator + params */
    ]),
  };
  
  return instruction;
}

// Using Pump.fun SDK
import { PumpFunSDK } from 'pumpdotfun-sdk';

const sdk = new PumpFunSDK(connection);

const buyResult = await sdk.buy(
  wallet,
  new PublicKey(mint),
  BigInt(solAmount * LAMPORTS_PER_SOL),
  BigInt(slippageBps),
  { commitment: 'confirmed' }
);
```

### Launch Token on Pump.fun

```typescript
interface LaunchParams {
  name: string;
  symbol: string;
  description: string;
  image: File | string;
  twitter?: string;
  telegram?: string;
  website?: string;
  initialBuyAmount?: number; // SOL for initial buy
}

async function launchOnPumpFun(params: LaunchParams) {
  // 1. Upload metadata to IPFS (Pump.fun handles this)
  const formData = new FormData();
  formData.append('name', params.name);
  formData.append('symbol', params.symbol);
  formData.append('description', params.description);
  formData.append('file', params.image);
  if (params.twitter) formData.append('twitter', params.twitter);
  if (params.telegram) formData.append('telegram', params.telegram);
  if (params.website) formData.append('website', params.website);
  
  const metadataResponse = await fetch('https://pump.fun/api/ipfs', {
    method: 'POST',
    body: formData,
  });
  const { metadataUri } = await metadataResponse.json();
  
  // 2. Create token with bonding curve
  const mintKeypair = Keypair.generate();
  
  const createIx = await sdk.createTokenInstruction(
    wallet.publicKey,
    params.name,
    params.symbol,
    metadataUri,
    mintKeypair
  );
  
  // 3. Optional: Initial buy
  let instructions = [createIx];
  if (params.initialBuyAmount) {
    const buyIx = await sdk.buyInstruction(
      wallet.publicKey,
      mintKeypair.publicKey,
      params.initialBuyAmount * LAMPORTS_PER_SOL
    );
    instructions.push(buyIx);
  }
  
  // 4. Send transaction
  const tx = new Transaction().add(...instructions);
  const signature = await sendAndConfirmTransaction(connection, tx, [wallet, mintKeypair]);
  
  return {
    mint: mintKeypair.publicKey.toString(),
    signature,
  };
}
```

### PumpSwap AMM (Post-Migration)

```typescript
// After graduation, tokens move to PumpSwap (zero-fee AMM)
// Jupiter automatically routes through PumpSwap

// Direct PumpSwap interaction
import { PumpSwapSDK } from 'pumpswap-sdk';

const pumpSwap = new PumpSwapSDK(connection);

// Get pool
const pool = await pumpSwap.getPool(tokenMint);

// Swap
const swapIx = await pumpSwap.swap({
  pool: pool.address,
  inputMint: 'SOL',
  outputMint: tokenMint,
  amount: 1e9,
  slippage: 0.5,
});
```

---

## Raydium Integration

AMM pools with concentrated liquidity (CLMM).

### Standard AMM Pool

```typescript
import { Raydium } from '@raydium-io/raydium-sdk-v2';

// Initialize SDK
const raydium = await Raydium.load({
  connection,
  owner: wallet,
});

// Get pool info
const poolInfo = await raydium.api.fetchPoolById({
  ids: poolId,
});

// Swap
const swapResult = await raydium.swap({
  poolInfo,
  amountIn: inputAmount,
  otherAmountThreshold: minOutput,
  inputMint: inputTokenMint,
});

const { transaction } = swapResult;
await sendAndConfirmTransaction(connection, transaction, [wallet]);
```

### Create AMM Pool

```typescript
// Create new AMM pool
const createPoolResult = await raydium.ammV4.createPool({
  baseMint: tokenAMint,
  quoteMint: tokenBMint,
  baseAmount: new BN(baseTokenAmount),
  quoteAmount: new BN(quoteTokenAmount),
  startTime: new BN(Math.floor(Date.now() / 1000)),
});

// Transaction includes:
// - Create pool accounts
// - Initialize pool
// - Add initial liquidity
```

### Add/Remove Liquidity

```typescript
// Add liquidity
const addLiquidityResult = await raydium.ammV4.addLiquidity({
  poolInfo,
  amountInA: new BN(amountA),
  amountInB: new BN(amountB),
  otherAmountMin: new BN(minOtherAmount),
});

// Remove liquidity
const removeLiquidityResult = await raydium.ammV4.removeLiquidity({
  poolInfo,
  lpAmount: new BN(lpTokensToRemove),
  amountMinA: new BN(minAmountA),
  amountMinB: new BN(minAmountB),
});
```

### Concentrated Liquidity (CLMM)

```typescript
// Create concentrated liquidity position
const createPositionResult = await raydium.clmm.openPosition({
  poolInfo,
  tickLower: -100,
  tickUpper: 100,
  liquidity: new BN(liquidityAmount),
  amountMaxA: new BN(maxAmountA),
  amountMaxB: new BN(maxAmountB),
});

// Increase liquidity
await raydium.clmm.increaseLiquidity({
  poolInfo,
  positionInfo,
  liquidity: new BN(additionalLiquidity),
});

// Decrease liquidity
await raydium.clmm.decreaseLiquidity({
  poolInfo,
  positionInfo,
  liquidity: new BN(liquidityToRemove),
});

// Collect fees
await raydium.clmm.collectFees({
  poolInfo,
  positionInfo,
});
```

---

## Helius Integration

RPC and data APIs for production applications.

### Priority Fee Estimation

```typescript
async function getPriorityFee(accountKeys: string[]) {
  const response = await fetch(HELIUS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'priority-fee',
      method: 'getPriorityFeeEstimate',
      params: [{
        accountKeys,
        options: {
          recommended: true,
          // Or get all levels
          // includeAllPriorityFeeLevels: true,
        },
      }],
    }),
  });
  
  const { result } = await response.json();
  return result.priorityFeeEstimate; // microlamports per CU
}

// Usage
const jupiterAccounts = ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'];
const fee = await getPriorityFee(jupiterAccounts);

// Add to transaction
transaction.add(
  ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: fee,
  })
);
```

### DAS API (Digital Asset Standard)

```typescript
// Get all NFTs and tokens for wallet
async function getAssets(ownerAddress: string) {
  const response = await fetch(HELIUS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'das-assets',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress,
        page: 1,
        limit: 1000,
        displayOptions: {
          showFungible: true,
          showNativeBalance: true,
        },
      },
    }),
  });
  
  const { result } = await response.json();
  return result.items; // Array of assets
}

// Search assets
async function searchAssets(params: {
  ownerAddress?: string;
  creatorAddress?: string;
  groupKey?: string;
  groupValue?: string;
}) {
  const response = await fetch(HELIUS_RPC_URL, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'search',
      method: 'searchAssets',
      params: {
        ...params,
        page: 1,
        limit: 100,
      },
    }),
  });
  
  return (await response.json()).result;
}
```

### Enhanced Transactions

```typescript
// Parse transaction with human-readable data
async function parseTransaction(signature: string) {
  const response = await fetch(
    `https://api.helius.xyz/v0/transactions?api-key=${HELIUS_API_KEY}`,
    {
      method: 'POST',
      body: JSON.stringify({
        transactions: [signature],
      }),
    }
  );
  
  const [parsedTx] = await response.json();
  return parsedTx;
  // Returns: type, description, tokenTransfers, nativeTransfers, etc.
}
```

---

## Complete Swap Flow

```typescript
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';

async function executeSwap(params: {
  inputMint: string;
  outputMint: string;
  amount: number; // In base units
  wallet: Keypair;
}) {
  const connection = new Connection(process.env.RPC_URL!);
  
  // 1. Check if Pump.fun or migrated
  const isOnPumpFun = await checkTokenStatus(params.outputMint);
  
  if (isOnPumpFun.isOnBondingCurve) {
    // Use Pump.fun SDK for bonding curve tokens
    return await buyOnPumpFun(params);
  }
  
  // 2. Get Jupiter quote
  const quote = await getQuote({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount.toString(),
    slippageBps: 50,
  });
  
  // 3. Get priority fee
  const priorityFee = await getPriorityFee([
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    params.inputMint,
    params.outputMint,
  ]);
  
  // 4. Build swap transaction
  const swapResponse = await getSwapTransaction({
    quoteResponse: quote,
    userPublicKey: params.wallet.publicKey.toString(),
    prioritizationFeeLamports: priorityFee,
  });
  
  // 5. Deserialize and sign
  const transaction = VersionedTransaction.deserialize(
    Buffer.from(swapResponse.swapTransaction, 'base64')
  );
  transaction.sign([params.wallet]);
  
  // 6. Send with retry
  let signature: string;
  for (let i = 0; i < 3; i++) {
    try {
      signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: true }
      );
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      if (!confirmation.value.err) {
        return { signature, success: true };
      }
    } catch (error) {
      if (i === 2) throw error;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  throw new Error('Swap failed after retries');
}
```

---

## Best Practices

### Transaction Success

1. **Use priority fees** - Always during congestion
2. **Skip preflight** - For faster submission
3. **Retry with backoff** - Handle transient failures
4. **Simulate first** - Catch errors before sending

### Slippage

1. **Use restrictIntermediateTokens** - More stable routes
2. **Start with 50 bps** - Increase if failing
3. **Consider price impact** - Check quote response

### Security

1. **Validate outputs** - Check received amounts
2. **Use reputable APIs** - Official Jupiter, Helius
3. **Monitor transactions** - Track all swaps
4. **Rate limit** - Prevent excessive trading
