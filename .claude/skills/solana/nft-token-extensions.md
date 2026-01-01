# Solana NFTs & Token Extensions Reference

Complete guide for Metaplex NFTs, compressed NFTs (Bubblegum), and Token-2022 extensions (December 2025).

## Metaplex Ecosystem

| Program | Purpose |
|---------|---------|
| MPL Core | Next-gen NFT standard |
| Token Metadata | Legacy NFT metadata |
| Bubblegum v2 | Compressed NFTs (cNFTs) |
| Candy Machine | NFT launches/mints |
| Umi | Universal client framework |

---

## Umi Framework

Metaplex's universal framework for Solana program interactions.

### Setup

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  keypairIdentity,
  generateSigner,
  percentAmount,
  publicKey,
} from '@metaplex-foundation/umi';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';

// Create Umi instance
const umi = createUmi('https://api.mainnet-beta.solana.com')
  .use(mplCore())
  .use(mplBubblegum())
  .use(mplTokenMetadata());

// Add identity (wallet)
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
const keypair = Keypair.fromSecretKey(/* ... */);
umi.use(keypairIdentity(fromWeb3JsKeypair(keypair)));

// Or generate new signer
const newSigner = generateSigner(umi);
```

### Uploading Metadata

```typescript
import { createGenericFile } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';

// Add Irys uploader
umi.use(irysUploader());

// Upload image
const imageFile = fs.readFileSync('./nft.png');
const genericFile = createGenericFile(imageFile, 'nft.png', {
  contentType: 'image/png',
});
const [imageUri] = await umi.uploader.upload([genericFile]);

// Upload metadata JSON
const metadata = {
  name: 'My NFT',
  symbol: 'MNFT',
  description: 'An awesome NFT',
  image: imageUri,
  attributes: [
    { trait_type: 'Rarity', value: 'Legendary' },
    { trait_type: 'Power', value: '100' },
  ],
  properties: {
    files: [{ uri: imageUri, type: 'image/png' }],
    category: 'image',
  },
};

const metadataUri = await umi.uploader.uploadJson(metadata);
```

---

## MPL Core (New Standard)

Simplified NFT standard with plugins.

### Create Collection

```typescript
import { 
  createCollection,
  ruleSet,
} from '@metaplex-foundation/mpl-core';

const collectionSigner = generateSigner(umi);

await createCollection(umi, {
  collection: collectionSigner,
  name: 'My Collection',
  uri: 'https://example.com/collection.json',
  plugins: [
    {
      type: 'Royalties',
      basisPoints: 500, // 5%
      creators: [
        { address: umi.identity.publicKey, percentage: 100 },
      ],
      ruleSet: ruleSet('None'), // or ProgramAllowList/ProgramDenyList
    },
  ],
}).sendAndConfirm(umi);

console.log('Collection:', collectionSigner.publicKey);
```

### Create Asset (NFT)

```typescript
import { 
  create,
  fetchAsset,
} from '@metaplex-foundation/mpl-core';

const assetSigner = generateSigner(umi);

await create(umi, {
  asset: assetSigner,
  name: 'My NFT #1',
  uri: metadataUri,
  collection: collectionSigner.publicKey,
  plugins: [
    {
      type: 'FreezeDelegate',
      frozen: false,
      authority: { type: 'Owner' },
    },
    {
      type: 'TransferDelegate',
      authority: { type: 'Owner' },
    },
  ],
}).sendAndConfirm(umi);

// Fetch asset
const asset = await fetchAsset(umi, assetSigner.publicKey);
console.log('Asset:', asset);
```

### Transfer Asset

```typescript
import { transfer } from '@metaplex-foundation/mpl-core';

await transfer(umi, {
  asset: assetPublicKey,
  newOwner: recipientAddress,
  collection: collectionPublicKey,
}).sendAndConfirm(umi);
```

### Burn Asset

```typescript
import { burn } from '@metaplex-foundation/mpl-core';

await burn(umi, {
  asset: assetPublicKey,
  collection: collectionPublicKey,
}).sendAndConfirm(umi);
```

---

## Bubblegum v2 (Compressed NFTs)

Mint millions of NFTs cost-effectively using Merkle trees.

### Cost Comparison

| NFTs | Standard Cost | cNFT Cost |
|------|---------------|-----------|
| 1,000 | ~2.4 SOL | ~0.05 SOL |
| 100,000 | ~240 SOL | ~0.5 SOL |
| 1,000,000 | ~2,400 SOL | ~5 SOL |

### Create Merkle Tree

```typescript
import { 
  createTree,
  mplBubblegum,
} from '@metaplex-foundation/mpl-bubblegum';

umi.use(mplBubblegum());

const merkleTree = generateSigner(umi);

// Tree size determines max NFTs
// maxDepth=14 = 16,384 NFTs
// maxDepth=20 = 1,048,576 NFTs
// maxDepth=30 = 1,073,741,824 NFTs

await createTree(umi, {
  merkleTree,
  maxDepth: 14,
  maxBufferSize: 64,
  canopyDepth: 10, // Reduces proof size for transfers
}).sendAndConfirm(umi);

console.log('Merkle Tree:', merkleTree.publicKey);
```

### Create Collection for cNFTs

```typescript
import { createNft } from '@metaplex-foundation/mpl-token-metadata';

// cNFTs use Token Metadata collections (not Core)
const collectionMint = generateSigner(umi);

await createNft(umi, {
  mint: collectionMint,
  name: 'My cNFT Collection',
  uri: 'https://example.com/collection.json',
  sellerFeeBasisPoints: percentAmount(5), // 5%
  isCollection: true,
}).sendAndConfirm(umi);
```

### Mint Compressed NFT

```typescript
import { 
  mintV1,
  parseLeafFromMintV1Transaction,
  findLeafAssetIdPda,
} from '@metaplex-foundation/mpl-bubblegum';

const { signature } = await mintV1(umi, {
  leafOwner: recipientAddress,
  merkleTree: merkleTree.publicKey,
  metadata: {
    name: 'My cNFT #1',
    uri: metadataUri,
    sellerFeeBasisPoints: 500,
    collection: { 
      key: collectionMint.publicKey, 
      verified: false,
    },
    creators: [
      { address: umi.identity.publicKey, verified: true, share: 100 },
    ],
  },
}).sendAndConfirm(umi, { send: { commitment: 'finalized' } });

// Get asset ID
const leaf = await parseLeafFromMintV1Transaction(umi, signature);
const assetId = findLeafAssetIdPda(umi, {
  merkleTree: merkleTree.publicKey,
  leafIndex: leaf.nonce,
});

console.log('Asset ID:', assetId);
```

### Batch Mint

```typescript
const recipients = ['addr1', 'addr2', /* ... */];

for (let i = 0; i < recipients.length; i++) {
  await mintV1(umi, {
    leafOwner: publicKey(recipients[i]),
    merkleTree: merkleTree.publicKey,
    metadata: {
      name: `My cNFT #${i + 1}`,
      uri: `https://example.com/metadata/${i + 1}.json`,
      sellerFeeBasisPoints: 500,
      collection: { key: collectionMint.publicKey, verified: false },
      creators: [
        { address: umi.identity.publicKey, verified: true, share: 100 },
      ],
    },
  }).sendAndConfirm(umi, { send: { commitment: 'confirmed' } });
}
```

### Transfer cNFT

```typescript
import { 
  transfer,
  getAssetWithProof,
} from '@metaplex-foundation/mpl-bubblegum';

// Get asset with Merkle proof
const assetWithProof = await getAssetWithProof(umi, assetId);

await transfer(umi, {
  ...assetWithProof,
  leafOwner: currentOwner,
  newLeafOwner: newOwner,
}).sendAndConfirm(umi);
```

### Verify Collection

```typescript
import { verifyCollection } from '@metaplex-foundation/mpl-bubblegum';

const assetWithProof = await getAssetWithProof(umi, assetId);

await verifyCollection(umi, {
  ...assetWithProof,
  collectionMint: collectionMint.publicKey,
  collectionAuthority: umi.identity,
}).sendAndConfirm(umi);
```

### Bubblegum v2 Features

```typescript
// Freeze cNFT
import { freezeAsset } from '@metaplex-foundation/mpl-bubblegum';

await freezeAsset(umi, {
  ...assetWithProof,
  leafOwner: ownerAddress,
}).sendAndConfirm(umi);

// Thaw cNFT
import { thawAsset } from '@metaplex-foundation/mpl-bubblegum';

await thawAsset(umi, {
  ...assetWithProof,
  leafOwner: ownerAddress,
}).sendAndConfirm(umi);

// Soulbound (non-transferable) - set at collection level
// Requires PermanentFreezeDelegate plugin on MPL-Core collection
```

---

## Fetching NFTs (DAS API)

```typescript
// Helius DAS API
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY';

// Get single asset
async function getAsset(assetId: string) {
  const response = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'get-asset',
      method: 'getAsset',
      params: { id: assetId },
    }),
  });
  return (await response.json()).result;
}

// Get all NFTs by owner
async function getAssetsByOwner(owner: string) {
  const response = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'get-assets',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: owner,
        page: 1,
        limit: 1000,
      },
    }),
  });
  return (await response.json()).result;
}

// Get assets by collection
async function getAssetsByCollection(collection: string) {
  const response = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'get-collection',
      method: 'getAssetsByGroup',
      params: {
        groupKey: 'collection',
        groupValue: collection,
        page: 1,
        limit: 1000,
      },
    }),
  });
  return (await response.json()).result;
}

// Get Merkle proof for cNFT
async function getAssetProof(assetId: string) {
  const response = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'get-proof',
      method: 'getAssetProof',
      params: { id: assetId },
    }),
  });
  return (await response.json()).result;
}
```

---

## Token-2022 (Token Extensions)

Advanced token features beyond SPL Token.

### Extension Types

**Mint Extensions:**
| Extension | Purpose |
|-----------|---------|
| TransferFee | Charge fees on transfers |
| TransferHook | Custom logic on transfer |
| MetadataPointer | Link to metadata |
| Metadata | On-chain metadata |
| NonTransferable | Soulbound tokens |
| PermanentDelegate | Irrevocable delegate |
| InterestBearing | Display interest rate |
| CloseMintAuthority | Allow closing mint |
| GroupPointer | Token grouping |
| MemberPointer | Group membership |
| ConfidentialTransfer | Private amounts |

**Account Extensions:**
| Extension | Purpose |
|-----------|---------|
| ImmutableOwner | Prevent owner change |
| MemoRequired | Require memo on transfer |
| DefaultAccountState | Frozen by default |
| CpiGuard | Prevent CPI transfers |

### Create Token with Extensions

```typescript
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeMetadataPointerInstruction,
  getMintLen,
  ExtensionType,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from '@solana/spl-token';
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} from '@solana/spl-token-metadata';

// Define extensions
const extensions = [
  ExtensionType.TransferFeeConfig,
  ExtensionType.MetadataPointer,
];

// Calculate mint size
const mintLen = getMintLen(extensions);

// Create mint account
const mintKeypair = Keypair.generate();
const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

const transaction = new Transaction().add(
  // Create account
  SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: mintLen,
    lamports,
    programId: TOKEN_2022_PROGRAM_ID,
  }),
  
  // Initialize transfer fee (1%, max 1000 tokens)
  createInitializeTransferFeeConfigInstruction(
    mintKeypair.publicKey,
    feeAuthority.publicKey,  // Can update fee
    withdrawAuthority.publicKey, // Can withdraw fees
    100, // 1% = 100 basis points
    BigInt(1000 * 10 ** decimals), // Max fee
    TOKEN_2022_PROGRAM_ID,
  ),
  
  // Initialize metadata pointer
  createInitializeMetadataPointerInstruction(
    mintKeypair.publicKey,
    updateAuthority.publicKey,
    mintKeypair.publicKey, // Metadata on mint itself
    TOKEN_2022_PROGRAM_ID,
  ),
  
  // Initialize mint
  createInitializeMintInstruction(
    mintKeypair.publicKey,
    decimals,
    mintAuthority.publicKey,
    freezeAuthority.publicKey,
    TOKEN_2022_PROGRAM_ID,
  ),
);

await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
```

### Add On-Chain Metadata

```typescript
// Token metadata
const tokenMetadata: TokenMetadata = {
  mint: mintKeypair.publicKey,
  name: 'My Token',
  symbol: 'MTK',
  uri: 'https://example.com/metadata.json',
  additionalMetadata: [
    ['description', 'An awesome token'],
    ['website', 'https://example.com'],
  ],
};

// Calculate additional space for metadata
const metadataLen = pack(tokenMetadata).length;
const newLen = mintLen + metadataLen;
const newLamports = await connection.getMinimumBalanceForRentExemption(newLen);

// Extend mint account and initialize metadata
const metadataTx = new Transaction().add(
  // Extend account size
  SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: mintKeypair.publicKey,
    lamports: newLamports - lamports,
  }),
  
  // Initialize metadata
  createInitializeInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    mint: mintKeypair.publicKey,
    metadata: mintKeypair.publicKey,
    name: tokenMetadata.name,
    symbol: tokenMetadata.symbol,
    uri: tokenMetadata.uri,
    mintAuthority: mintAuthority.publicKey,
    updateAuthority: updateAuthority.publicKey,
  }),
  
  // Add custom fields
  createUpdateFieldInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    metadata: mintKeypair.publicKey,
    updateAuthority: updateAuthority.publicKey,
    field: 'description',
    value: 'An awesome token',
  }),
);

await sendAndConfirmTransaction(connection, metadataTx, [payer, mintAuthority, updateAuthority]);
```

### Transfer Hook

Custom logic executed on every transfer.

```rust
// Anchor program implementing transfer hook
use anchor_lang::prelude::*;
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

declare_id!("YourProgramId");

#[program]
pub mod transfer_hook {
    use super::*;

    // Required: implement the execute instruction
    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        // Custom logic here
        // Examples:
        // - KYC verification
        // - Royalty collection
        // - Transfer logging
        // - Conditional transfers
        
        msg!("Transfer hook executed for {} tokens", amount);
        
        // Return error to block transfer
        // return Err(ErrorCode::TransferNotAllowed.into());
        
        Ok(())
    }
    
    // Required: initialize extra account metas
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        // Define additional accounts needed by execute
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account()]
    pub source_token: InterfaceAccount<'info, TokenAccount>,
    #[account()]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account()]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Owner is validated by token program
    pub owner: UncheckedAccount<'info>,
    #[account()]
    pub extra_account_meta_list: UncheckedAccount<'info>,
}
```

### Create Token with Transfer Hook

```typescript
import {
  createInitializeTransferHookInstruction,
  ExtensionType,
} from '@solana/spl-token';

const extensions = [ExtensionType.TransferHook];
const mintLen = getMintLen(extensions);

const transaction = new Transaction().add(
  SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: mintLen,
    lamports: await connection.getMinimumBalanceForRentExemption(mintLen),
    programId: TOKEN_2022_PROGRAM_ID,
  }),
  
  // Initialize transfer hook
  createInitializeTransferHookInstruction(
    mintKeypair.publicKey,
    hookAuthority.publicKey,
    transferHookProgramId, // Your hook program
    TOKEN_2022_PROGRAM_ID,
  ),
  
  createInitializeMintInstruction(
    mintKeypair.publicKey,
    decimals,
    mintAuthority.publicKey,
    null, // No freeze authority
    TOKEN_2022_PROGRAM_ID,
  ),
);
```

### Non-Transferable (Soulbound)

```typescript
import {
  createInitializeNonTransferableMintInstruction,
  ExtensionType,
} from '@solana/spl-token';

const extensions = [ExtensionType.NonTransferable];
const mintLen = getMintLen(extensions);

const transaction = new Transaction().add(
  SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: mintLen,
    lamports: await connection.getMinimumBalanceForRentExemption(mintLen),
    programId: TOKEN_2022_PROGRAM_ID,
  }),
  
  // Initialize non-transferable
  createInitializeNonTransferableMintInstruction(
    mintKeypair.publicKey,
    TOKEN_2022_PROGRAM_ID,
  ),
  
  createInitializeMintInstruction(
    mintKeypair.publicKey,
    decimals,
    mintAuthority.publicKey,
    null,
    TOKEN_2022_PROGRAM_ID,
  ),
);

// Tokens minted from this mint cannot be transferred
```

### Permanent Delegate

```typescript
import {
  createInitializePermanentDelegateInstruction,
  ExtensionType,
} from '@solana/spl-token';

const extensions = [ExtensionType.PermanentDelegate];
const mintLen = getMintLen(extensions);

const transaction = new Transaction().add(
  SystemProgram.createAccount({/* ... */}),
  
  // Set permanent delegate
  createInitializePermanentDelegateInstruction(
    mintKeypair.publicKey,
    delegateAuthority.publicKey, // Can transfer/burn any holder's tokens
    TOKEN_2022_PROGRAM_ID,
  ),
  
  createInitializeMintInstruction({/* ... */}),
);
```

### Interest-Bearing Tokens

```typescript
import {
  createInitializeInterestBearingMintInstruction,
  createAmountToUiAmountInstruction,
  ExtensionType,
} from '@solana/spl-token';

const extensions = [ExtensionType.InterestBearingConfig];
const mintLen = getMintLen(extensions);

const rate = 500; // 5% annual interest (basis points)

const transaction = new Transaction().add(
  SystemProgram.createAccount({/* ... */}),
  
  createInitializeInterestBearingMintInstruction(
    mintKeypair.publicKey,
    rateAuthority.publicKey,
    rate,
    TOKEN_2022_PROGRAM_ID,
  ),
  
  createInitializeMintInstruction({/* ... */}),
);

// Note: Interest is cosmetic only - no new tokens are minted
// Use amountToUiAmount to display with interest applied
```

---

## Gill Token Operations

```typescript
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstruction,
  getTransferInstruction,
  getMintToInstruction,
  TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
} from 'gill/programs';

// Find ATA
const [ata] = await findAssociatedTokenPda({
  owner: ownerAddress,
  mint: mintAddress,
  tokenProgram: TOKEN_2022_PROGRAM_ADDRESS, // or TOKEN_PROGRAM_ADDRESS
});

// Create ATA
const createAtaIx = getCreateAssociatedTokenInstruction({
  payer: payerSigner,
  owner: ownerAddress,
  mint: mintAddress,
  ata,
  tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
});

// Transfer
const transferIx = getTransferInstruction({
  source: sourceAta,
  destination: destAta,
  authority: ownerSigner,
  amount: 1_000_000n,
  tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
});

// Mint
const mintIx = getMintToInstruction({
  mint: mintAddress,
  token: destAta,
  mintAuthority: mintAuthoritySigner,
  amount: 1_000_000n,
  tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
});
```

---

## Best Practices

### NFTs

1. **Use MPL Core** for new projects (simpler, cheaper)
2. **Use Bubblegum v2** for large collections (1000+ NFTs)
3. **Pre-calculate tree size** based on max collection size
4. **Store metadata on Arweave/IPFS** for permanence
5. **Verify collections** after minting

### Token-2022

1. **Plan extensions upfront** - Most can't be added later
2. **Check extension compatibility** - Some combinations don't work
3. **Test on devnet** - Extensions have complex interactions
4. **Use official SDK** - @solana/spl-token v0.4+
5. **Consider wallet support** - Not all wallets support all extensions
