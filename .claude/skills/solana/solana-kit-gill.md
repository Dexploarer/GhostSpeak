# @solana/kit & Gill SDK Reference

Complete API reference for modern Solana JavaScript development (December 2025).

## Package Overview

### @solana/kit Packages

| Package | Purpose |
|---------|---------|
| `@solana/kit` | Main entry point, re-exports all packages |
| `@solana/accounts` | Account fetching and decoding |
| `@solana/addresses` | Address utilities and validation |
| `@solana/codecs` | Data serialization/deserialization |
| `@solana/errors` | Typed error handling |
| `@solana/functional` | Functional utilities (pipe, etc.) |
| `@solana/instructions` | Instruction building |
| `@solana/keys` | Cryptographic key operations |
| `@solana/rpc` | JSON-RPC client |
| `@solana/rpc-subscriptions` | WebSocket subscriptions |
| `@solana/signers` | Signer abstractions |
| `@solana/transaction-messages` | Transaction message building |
| `@solana/transactions` | Transaction compilation/signing |

### Gill Packages

| Package | Purpose |
|---------|---------|
| `gill` | Core library with QoL improvements |
| `gill/node` | Node.js specific utilities |
| `gill/programs` | Program client re-exports |
| `@gillsdk/react` | React hooks |
| `@gillsdk/solana-pay` | Solana Pay integration |

---

## RPC Client

### @solana/kit

```typescript
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';

// HTTP RPC
const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');

// WebSocket subscriptions
const rpcSubscriptions = createSolanaRpcSubscriptions(
  'wss://api.mainnet-beta.solana.com'
);

// RPC methods
const slot = await rpc.getSlot().send();
const balance = await rpc.getBalance(address).send();
const blockhash = await rpc.getLatestBlockhash().send();
const accountInfo = await rpc.getAccountInfo(address).send();

// With configuration
const accountInfo = await rpc
  .getAccountInfo(address, { 
    commitment: 'confirmed',
    encoding: 'base64',
  })
  .send();
```

### Gill

```typescript
import { createSolanaClient } from 'gill';

// Simplified client creation
const { rpc, rpcSubscriptions, sendAndConfirmTransaction } = createSolanaClient({
  urlOrMoniker: 'mainnet', // 'devnet' | 'testnet' | 'localnet' | custom URL
});

// Same RPC methods as @solana/kit
const slot = await rpc.getSlot().send();
```

---

## Address Utilities

```typescript
import {
  address,
  getAddressFromPublicKey,
  isAddress,
  assertIsAddress,
  getAddressEncoder,
  getAddressDecoder,
  getAddressCodec,
} from '@solana/kit';

// Create address from string
const addr = address('11111111111111111111111111111111');

// Validate address
if (isAddress(someString)) {
  // someString is now typed as Address
}

// Assert (throws if invalid)
assertIsAddress(someString);

// From public key
const addr = await getAddressFromPublicKey(publicKey);

// Program Derived Address (PDA)
import { getProgramDerivedAddress } from '@solana/kit';

const [pda, bump] = await getProgramDerivedAddress({
  programAddress: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  seeds: [
    getAddressEncoder().encode(ownerAddress),
    getAddressEncoder().encode(mintAddress),
  ],
});
```

---

## Key Management

### KeyPairSigner

```typescript
import {
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKey,
  isKeyPairSigner,
} from '@solana/kit';

// Generate new (non-extractable - more secure)
const signer = await generateKeyPairSigner();
// signer.address - the public address
// Cannot extract private key

// From bytes (extractable)
const signer = await createKeyPairSignerFromBytes(secretKeyBytes);

// From private key
const signer = await createKeyPairSignerFromPrivateKey(privateKey);

// Check type
if (isKeyPairSigner(maybeSigner)) {
  // It's a KeyPairSigner
}
```

### Gill Node Utilities

```typescript
import { 
  loadKeypairSignerFromFile,
  loadKeypairSignerFromEnvironment,
  generateExtractableKeyPairSigner,
} from 'gill/node';

// Load from Solana CLI default path (~/.config/solana/id.json)
const signer = await loadKeypairSignerFromFile();

// Load from custom path
const signer = await loadKeypairSignerFromFile('/path/to/keypair.json');

// Load from environment variable
const signer = await loadKeypairSignerFromEnvironment('PRIVATE_KEY');

// Generate extractable (can save to file)
const signer = await generateExtractableKeyPairSigner();
```

---

## Signer Types

### Interface Hierarchy

```typescript
// Base signer interface
interface Signer {
  address: Address;
}

// Partial signers - provide signatures without modifying data
interface MessagePartialSigner extends Signer {
  signMessages(messages: SignableMessage[]): Promise<SignatureDictionary[]>;
}

interface TransactionPartialSigner extends Signer {
  signTransactions(transactions: Transaction[]): Promise<SignatureDictionary[]>;
}

// Modifying signers - can alter data before signing
interface MessageModifyingSigner extends Signer {
  modifyAndSignMessages(messages: SignableMessage[]): Promise<SignableMessage[]>;
}

interface TransactionModifyingSigner extends Signer {
  modifyAndSignTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}

// Sending signer - signs and sends
interface TransactionSendingSigner extends Signer {
  signAndSendTransactions(transactions: Transaction[]): Promise<SignatureBytes[]>;
}

// KeyPairSigner implements both partial signer interfaces
interface KeyPairSigner extends MessagePartialSigner, TransactionPartialSigner {
  keyPair: CryptoKeyPair;
}
```

### Type Guards

```typescript
import {
  isMessagePartialSigner,
  isTransactionPartialSigner,
  isMessageModifyingSigner,
  isTransactionModifyingSigner,
  isTransactionSendingSigner,
  isKeyPairSigner,
  assertIsKeyPairSigner,
} from '@solana/kit';

if (isTransactionSendingSigner(signer)) {
  // Wallet adapter signer
  await signer.signAndSendTransactions([tx]);
}
```

---

## Transaction Building

### @solana/kit Pattern

```typescript
import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  prependTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  partiallySignTransactionMessageWithSigners,
  compileTransaction,
  pipe,
} from '@solana/kit';

// Get blockhash
const { value: latestBlockhash } = await rpc
  .getLatestBlockhash({ commitment: 'confirmed' })
  .send();

// Build with pipe (functional composition)
const transactionMessage = pipe(
  createTransactionMessage({ version: 0 }), // or 'legacy'
  (m) => setTransactionMessageFeePayerSigner(signer, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
  (m) => appendTransactionMessageInstruction(instruction1, m),
  (m) => appendTransactionMessageInstructions([instruction2, instruction3], m),
);

// Sign (extracts all signers embedded in instructions)
const signedTx = await signTransactionMessageWithSigners(transactionMessage);

// Or partial sign (when not all signers available)
const partiallySignedTx = await partiallySignTransactionMessageWithSigners(
  transactionMessage
);
```

### Gill Simplified Pattern

```typescript
import { 
  createTransaction,
  signTransactionMessageWithSigners,
} from 'gill';
import { getAddMemoInstruction } from 'gill/programs';

const { rpc, sendAndConfirmTransaction } = createSolanaClient({
  urlOrMoniker: 'devnet',
});

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

// Simplified transaction creation
const transaction = createTransaction({
  version: 'legacy', // or 0
  feePayer: signer,
  instructions: [
    getAddMemoInstruction({ memo: 'Hello!' }),
    // ... more instructions
  ],
  latestBlockhash,
  // Optional compute budget
  computeUnitLimit: 200_000,
  computeUnitPrice: 1_000, // microlamports
});

// Sign
const signedTx = await signTransactionMessageWithSigners(transaction);

// Send and confirm
const signature = await sendAndConfirmTransaction(signedTx, {
  commitment: 'confirmed',
});
```

---

## Instructions

### Building Instructions

```typescript
import { 
  createInstruction,
  AccountRole,
} from '@solana/kit';

// Manual instruction creation
const instruction = {
  programAddress: address('11111111111111111111111111111111'),
  accounts: [
    { address: fromAddress, role: AccountRole.WRITABLE_SIGNER },
    { address: toAddress, role: AccountRole.WRITABLE },
  ],
  data: new Uint8Array([/* instruction data */]),
};

// Account roles
AccountRole.READONLY           // Can only read
AccountRole.WRITABLE           // Can read and write
AccountRole.READONLY_SIGNER    // Read-only, must sign
AccountRole.WRITABLE_SIGNER    // Writable, must sign
```

### System Program Instructions

```typescript
import { getTransferSolInstruction } from '@solana-program/system';

const transferIx = getTransferSolInstruction({
  source: signer, // KeyPairSigner embeds signature requirement
  destination: recipientAddress,
  amount: lamports(1_000_000_000n), // 1 SOL
});
```

### Compute Budget Instructions

```typescript
import {
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
} from '@solana-program/compute-budget';

// Set compute unit limit
const cuLimitIx = getSetComputeUnitLimitInstruction({
  units: 200_000,
});

// Set priority fee (microlamports per CU)
const cuPriceIx = getSetComputeUnitPriceInstruction({
  microLamports: 1_000n,
});

// Add to beginning of transaction
const tx = pipe(
  createTransactionMessage({ version: 0 }),
  // ... fee payer, blockhash
  (m) => prependTransactionMessageInstruction(cuPriceIx, m),
  (m) => prependTransactionMessageInstruction(cuLimitIx, m),
  (m) => appendTransactionMessageInstruction(mainInstruction, m),
);
```

---

## Token Operations

### Gill Token Integration

Gill re-exports `@solana-program/token-2022` which is backwards compatible with the original Token Program.

```typescript
import {
  getCreateAssociatedTokenInstruction,
  getTransferInstruction,
  getMintToInstruction,
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
} from 'gill/programs';

// Find ATA
const [ata] = await findAssociatedTokenPda({
  owner: ownerAddress,
  mint: mintAddress,
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
});

// Create ATA instruction
const createAtaIx = getCreateAssociatedTokenInstruction({
  payer: payerSigner,
  owner: ownerAddress,
  mint: mintAddress,
  ata: ata,
});

// Transfer tokens
const transferIx = getTransferInstruction({
  source: sourceAta,
  destination: destAta,
  authority: ownerSigner,
  amount: 1_000_000n, // in base units
});

// Mint tokens
const mintIx = getMintToInstruction({
  mint: mintAddress,
  token: destinationAta,
  mintAuthority: mintAuthoritySigner,
  amount: 1_000_000n,
});
```

---

## Account Fetching

### Single Account

```typescript
import { fetchEncodedAccount, fetchJsonParsedAccount } from '@solana/kit';

// Raw account data
const account = await rpc.getAccountInfo(address).send();
// account.value?.data - Uint8Array
// account.value?.lamports - bigint
// account.value?.owner - Address

// With decoder
import { getMintDecoder } from '@solana-program/token-2022';

const mintAccount = await fetchEncodedAccount(rpc, mintAddress);
const mintData = getMintDecoder().decode(mintAccount.data);
```

### Multiple Accounts

```typescript
// Batch fetch
const accounts = await rpc
  .getMultipleAccounts([address1, address2, address3])
  .send();

// Program accounts with filters
const tokenAccounts = await rpc
  .getProgramAccounts(TOKEN_PROGRAM_ADDRESS, {
    filters: [
      { dataSize: 165n }, // Token account size
      { memcmp: { offset: 32n, bytes: ownerAddress } },
    ],
  })
  .send();
```

---

## Subscriptions

```typescript
import { createSolanaRpcSubscriptions } from '@solana/kit';

const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

// Slot notifications
const slotSub = await rpcSubscriptions
  .slotNotifications()
  .subscribe({ abortSignal: AbortSignal.timeout(60_000) });

for await (const notification of slotSub) {
  console.log('Slot:', notification.slot);
}

// Account changes
const accountSub = await rpcSubscriptions
  .accountNotifications(address, { commitment: 'confirmed' })
  .subscribe({ abortSignal });

for await (const notification of accountSub) {
  console.log('Account updated:', notification.value);
}

// Signature status
const sigSub = await rpcSubscriptions
  .signatureNotifications(signature, { commitment: 'confirmed' })
  .subscribe({ abortSignal });

for await (const notification of sigSub) {
  if (notification.value.err) {
    console.error('Transaction failed');
  } else {
    console.log('Transaction confirmed');
  }
  break; // Only need one notification
}

// Logs
const logsSub = await rpcSubscriptions
  .logsNotifications({ mentions: [programAddress] }, { commitment: 'confirmed' })
  .subscribe({ abortSignal });
```

---

## React Hooks (@gillsdk/react)

### Provider Setup

```tsx
'use client'; // Required for Next.js

import { createSolanaClient } from 'gill';
import { SolanaProvider } from '@gillsdk/react';

const client = createSolanaClient({ urlOrMoniker: 'devnet' });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProvider client={client}>
      {children}
    </SolanaProvider>
  );
}
```

### Account Hooks

```tsx
import {
  useAccount,
  useBalance,
  useMultipleAccounts,
  useProgramAccounts,
} from '@gillsdk/react';

function WalletInfo({ address }: { address: string }) {
  // Balance in lamports
  const { data: balance, isLoading, error } = useBalance({ address });

  // Account info
  const { data: account } = useAccount({ address });

  // With custom decoder
  const { data: decodedAccount } = useAccount({
    address: mintAddress,
    decoder: getMintDecoder(),
  });

  // Multiple accounts
  const { data: accounts } = useMultipleAccounts({
    addresses: [addr1, addr2, addr3],
  });

  // Program accounts
  const { data: programAccounts } = useProgramAccounts({
    program: TOKEN_PROGRAM_ADDRESS,
    config: {
      filters: [{ dataSize: 165n }],
    },
  });

  return (
    <div>
      {isLoading && <span>Loading...</span>}
      {balance && <span>{Number(balance.value) / 1e9} SOL</span>}
    </div>
  );
}
```

### Token Hooks

```tsx
import {
  useTokenMint,
  useTokenAccount,
  useTokenAccountBalance,
} from '@gillsdk/react';

function TokenInfo({ mint, owner }: { mint: string; owner: string }) {
  // Mint info (decimals, supply, etc.)
  const { data: mintInfo } = useTokenMint({ mint });

  // Token account by mint + owner
  const { data: tokenAccount } = useTokenAccount({ mint, owner });

  // Or by ATA address directly
  const { data: tokenAccountByAta } = useTokenAccount({ ata: ataAddress });

  // Token balance
  const { data: tokenBalance } = useTokenAccountBalance({
    address: ataAddress,
  });

  return (
    <div>
      <p>Decimals: {mintInfo?.decimals}</p>
      <p>Balance: {tokenBalance?.value.uiAmountString}</p>
    </div>
  );
}
```

### Network Hooks

```tsx
import {
  useLatestBlockhash,
  useSlot,
  useRecentPrioritizationFees,
} from '@gillsdk/react';

function NetworkInfo() {
  const { data: blockhash } = useLatestBlockhash({
    config: { commitment: 'confirmed' },
  });

  const { data: slot } = useSlot();

  const { data: fees } = useRecentPrioritizationFees({
    addresses: [programAddress], // Optional: specific accounts
  });

  return (
    <div>
      <p>Slot: {slot?.toString()}</p>
      <p>Blockhash: {blockhash?.value.blockhash}</p>
    </div>
  );
}
```

### Transaction Hooks

```tsx
import {
  useTransaction,
  useSimulateTransaction,
  useSignatureStatuses,
  useSignaturesForAddress,
} from '@gillsdk/react';

function TransactionInfo({ signature }: { signature: string }) {
  const { data: tx } = useTransaction({ signature });

  const { data: status } = useSignatureStatuses({
    signatures: [signature],
  });

  const { data: history } = useSignaturesForAddress({
    address: walletAddress,
    config: { limit: 10 },
  });

  return (
    <div>
      <p>Status: {status?.[0]?.confirmationStatus}</p>
      <p>Slot: {tx?.slot}</p>
    </div>
  );
}
```

---

## Error Handling

```typescript
import {
  isSolanaError,
  SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
  SOLANA_ERROR__RPC__SERVER_ERROR,
} from '@solana/kit';

try {
  await sendAndConfirmTransaction(signedTx);
} catch (error) {
  if (isSolanaError(error, SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND)) {
    // Blockhash expired, retry with new blockhash
  } else if (isSolanaError(error, SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT)) {
    // Not enough SOL for rent
  } else {
    throw error;
  }
}
```

---

## Legacy Compatibility (@solana/compat)

```typescript
import {
  fromLegacyKeypair,
  fromLegacyPublicKey,
  toLegacyKeypair,
  toLegacyPublicKey,
  fromVersionedTransaction,
} from '@solana/compat';
import { Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';

// Convert legacy Keypair to KeyPairSigner
const legacyKeypair = Keypair.generate();
const signer = await fromLegacyKeypair(legacyKeypair);

// Convert legacy PublicKey to Address
const legacyPubkey = new PublicKey('...');
const addr = fromLegacyPublicKey(legacyPubkey);

// Convert back
const pubkey = toLegacyPublicKey(addr);

// Convert VersionedTransaction
const legacyTx = VersionedTransaction.deserialize(buffer);
const kitTx = fromVersionedTransaction(legacyTx);
```

---

## Solana Pay (@gillsdk/solana-pay)

```typescript
import {
  encodeSolanaPayURL,
  parseSolanaPayURL,
  solanaPayTransactionRequest,
} from '@gillsdk/solana-pay';

// Create transfer request URL
const transferUrl = encodeSolanaPayURL({
  type: 'transfer',
  recipient: merchantAddress,
  amount: 1.5, // SOL
  splToken: usdcMintAddress, // Optional: for SPL tokens
  reference: referenceKeypair.publicKey, // For tracking
  label: 'My Store',
  message: 'Thanks for your purchase!',
  memo: 'Order #12345',
});
// solana:recipient?amount=1.5&...

// Create transaction request URL
const txRequestUrl = encodeSolanaPayURL({
  type: 'transaction',
  link: 'https://mystore.com/api/checkout',
});
// solana:https://mystore.com/api/checkout

// Parse any Solana Pay URL
const parsed = parseSolanaPayURL(url);
if (parsed.type === 'transfer') {
  // Handle transfer
} else {
  // Handle transaction request
}

// Transaction request flow (merchant side)
// GET - return label and icon
// POST - return serialized transaction
```

---

## Best Practices

### Transaction Building

1. **Always use versioned transactions** (version 0) for Address Lookup Tables
2. **Set compute unit limit** based on simulation
3. **Include priority fee** during congestion
4. **Embed signers in instructions** for automatic extraction

### Performance

1. **Batch RPC calls** with `getMultipleAccounts`
2. **Use confirmed commitment** for balance (not finalized)
3. **Cache blockhash** for ~60 seconds
4. **Use WebSocket subscriptions** for real-time data

### Security

1. **Use non-extractable signers** (`generateKeyPairSigner`)
2. **Validate addresses** before use (`assertIsAddress`)
3. **Check transaction simulation** before sending
4. **Never log private keys**
