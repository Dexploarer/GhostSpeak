# Token-2022 Instructions

## Overview

Token-2022 instructions integrate advanced SPL Token-2022 features into the GhostSpeak protocol, including confidential transfers, transfer fees, interest-bearing tokens, and more.

## Core Instructions

### 1. Create Token-2022 Mint

Creates a new token mint with Token-2022 extensions.

```typescript
export interface CreateToken2022MintArgs {
  decimals: number                  // Token decimals (0-9)
  enableTransferFee: boolean        // Enable transfer fees
  enableConfidentialTransfers: boolean  // Enable confidential transfers
  enableInterestBearing: boolean    // Enable interest bearing
  enableDefaultAccountState: boolean // Enable default account state
  enableMintCloseAuthority: boolean // Enable mint close authority
  metadata?: TokenMetadata          // Optional on-chain metadata
}

export interface CreateToken2022MintAccounts {
  mint: Address                     // Mint account (to create)
  mintAuthority: TransactionSigner  // Mint authority
  freezeAuthority?: Address         // Optional freeze authority
  payer: TransactionSigner          // Transaction payer
  tokenProgram: Address             // Token-2022 program
  systemProgram?: Address           // System program
}

export interface TokenMetadata {
  name: string
  symbol: string
  uri: string                       // Metadata URI
}
```

**Discriminator**: `[234, 156, 78, 12, 45, 89, 123, 67]`

**Implementation**:
```typescript
export function createCreateToken2022MintInstruction(
  accounts: CreateToken2022MintAccounts,
  args: CreateToken2022MintArgs
): IInstruction {
  // Validate decimals
  if (args.decimals < 0 || args.decimals > 9) {
    throw new Error('Decimals must be between 0 and 9')
  }
  
  // Calculate space needed for extensions
  const space = calculateMintSpace(args)
  
  // Encode arguments
  const schema = {
    struct: {
      decimals: 'u8',
      enableTransferFee: 'bool',
      enableConfidentialTransfers: 'bool',
      enableInterestBearing: 'bool',
      enableDefaultAccountState: 'bool',
      enableMintCloseAuthority: 'bool',
      metadata: { option: { struct: {
        name: 'string',
        symbol: 'string',
        uri: 'string'
      }}}
    }
  }
  
  const encodedArgs = serialize(schema, args)
  const data = Buffer.concat([DISCRIMINATORS.createToken2022Mint, encodedArgs])
  
  // Build accounts
  const accountMetas = [
    { address: accounts.mint, role: 'writable' },
    { address: accounts.mintAuthority.address, role: 'writableSigner' },
    { address: accounts.payer.address, role: 'writableSigner' },
    { address: accounts.tokenProgram, role: 'readonly' },
    { address: accounts.systemProgram ?? SYSTEM_PROGRAM, role: 'readonly' }
  ]
  
  if (accounts.freezeAuthority) {
    accountMetas.push({ address: accounts.freezeAuthority, role: 'readonly' })
  }
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts: accountMetas,
    data
  }
}
```

### 2. Initialize Transfer Fee Config

Sets up transfer fee configuration for a Token-2022 mint.

```typescript
export interface InitializeTransferFeeConfigArgs {
  transferFeeBasisPoints: number    // Fee in basis points (0-10000)
  maximumFee: bigint               // Maximum fee in tokens
  transferFeeAuthority?: Address    // Fee authority
  withdrawWithheldAuthority?: Address // Withdraw authority
}

export interface InitializeTransferFeeConfigAccounts {
  mint: Address                     // Token mint
  mintAuthority: TransactionSigner  // Must be current authority
  tokenProgram: Address             // Token-2022 program
}
```

**Discriminator**: `[123, 45, 67, 89, 234, 56, 78, 90]`

**Fee Calculation**:
```typescript
function calculateTransferFee(
  amount: bigint,
  feeBasisPoints: number,
  maximumFee: bigint
): bigint {
  const fee = (amount * BigInt(feeBasisPoints)) / 10000n
  return fee > maximumFee ? maximumFee : fee
}
```

### 3. Initialize Confidential Transfer Mint

Enables confidential transfers on a Token-2022 mint.

```typescript
export interface InitializeConfidentialTransferMintArgs {
  autoApproveNewAccounts: boolean   // Auto-approve confidential accounts
  auditingElGamalPubkey?: string    // Optional auditing pubkey
}

export interface InitializeConfidentialTransferMintAccounts {
  mint: Address                     // Token mint
  mintAuthority: TransactionSigner  // Must be current authority
  tokenProgram: Address             // Token-2022 program
}
```

**Discriminator**: `[178, 90, 12, 234, 45, 67, 89, 123]`

**ElGamal Encryption**:
```typescript
// Confidential transfers use ElGamal encryption
interface ElGamalKeypair {
  publicKey: Uint8Array            // 32 bytes
  secretKey: Uint8Array            // 32 bytes
}

// Generate ElGamal keypair for confidential transfers
function generateElGamalKeypair(): ElGamalKeypair {
  const secretKey = randomBytes(32)
  const publicKey = scalarBaseMultiply(secretKey)
  return { publicKey, secretKey }
}
```

### 4. Initialize Interest Bearing Config

Configures a mint to automatically accrue interest.

```typescript
export interface InitializeInterestBearingConfigArgs {
  rateAuthority?: Address           // Authority to update rate
  rate: number                      // Interest rate (basis points per year)
}

export interface InitializeInterestBearingConfigAccounts {
  mint: Address                     // Token mint
  mintAuthority: TransactionSigner  // Must be current authority
  tokenProgram: Address             // Token-2022 program
}
```

**Discriminator**: `[56, 78, 90, 123, 234, 45, 67, 89]`

**Interest Calculation**:
```typescript
function calculateInterest(
  principal: bigint,
  rate: number,                     // Basis points per year
  timeElapsed: bigint              // Seconds
): bigint {
  const secondsPerYear = 31536000n
  const interest = (principal * BigInt(rate) * timeElapsed) / 
                   (10000n * secondsPerYear)
  return interest
}
```

### 5. Initialize Default Account State

Sets default state for all new token accounts.

```typescript
export interface InitializeDefaultAccountStateArgs {
  state: AccountState               // Default state for new accounts
}

export interface InitializeDefaultAccountStateAccounts {
  mint: Address                     // Token mint
  mintAuthority: TransactionSigner  // Must be current authority
  tokenProgram: Address             // Token-2022 program
}

export enum AccountState {
  Uninitialized = 0,
  Initialized = 1,
  Frozen = 2
}
```

**Discriminator**: `[234, 123, 45, 67, 89, 12, 34, 56]`

### 6. Initialize Mint Close Authority

Allows a mint to be closed and rent reclaimed.

```typescript
export interface InitializeMintCloseAuthorityArgs {
  closeAuthority?: Address          // Authority that can close mint
}

export interface InitializeMintCloseAuthorityAccounts {
  mint: Address                     // Token mint
  mintAuthority: TransactionSigner  // Must be current authority
  tokenProgram: Address             // Token-2022 program
}
```

**Discriminator**: `[90, 12, 234, 56, 78, 123, 45, 67]`

## Advanced Token Operations

### Confidential Transfer Flow

```typescript
// 1. Configure account for confidential transfers
export interface ConfigureConfidentialAccountArgs {
  elGamalPubkey: Uint8Array        // Account's ElGamal public key
  decryptableZeroBalance: Uint8Array // Proof of zero balance
}

// 2. Deposit into confidential balance
export interface DepositConfidentialArgs {
  amount: bigint                    // Amount to deposit
  decimals: number                  // Token decimals
}

// 3. Confidential transfer
export interface ConfidentialTransferArgs {
  encryptedAmount: Uint8Array       // ElGamal encrypted amount
  transferProof: TransferProof      // Zero-knowledge proof
}

export interface TransferProof {
  equalityProof: Uint8Array         // Proves sender knows amount
  validityProof: Uint8Array         // Proves amount is valid
  rangeProof: Uint8Array           // Proves amount in valid range
}

// 4. Withdraw from confidential balance
export interface WithdrawConfidentialArgs {
  amount: bigint                    // Amount to withdraw
  decimals: number                  // Token decimals
  withdrawProof: Uint8Array         // Proof of available balance
}
```

### Transfer Fee Operations

```typescript
// Collect accumulated transfer fees
export interface HarvestWithheldTokensArgs {
  sources: Address[]                // Token accounts with fees
}

export interface HarvestWithheldTokensAccounts {
  mint: Address                     // Token mint
  destination: Address              // Fee collection account
  withdrawAuthority: TransactionSigner // Withdraw authority
  tokenProgram: Address             // Token-2022 program
}

// Withdraw collected fees to SOL
export interface WithdrawWithheldTokensArgs {
  amount: bigint                    // Amount to withdraw
}

export interface WithdrawWithheldTokensAccounts {
  mint: Address                     // Token mint
  feeAccount: Address               // Account holding fees
  destination: Address              // SOL destination
  withdrawAuthority: TransactionSigner // Withdraw authority
  tokenProgram: Address             // Token-2022 program
}
```

### Metadata Operations

```typescript
// Update token metadata
export interface UpdateTokenMetadataArgs {
  field: MetadataField              // Field to update
  value: string                     // New value
}

export enum MetadataField {
  Name = 0,
  Symbol = 1,
  Uri = 2
}

export interface UpdateTokenMetadataAccounts {
  mint: Address                     // Token mint
  metadataAuthority: TransactionSigner // Metadata authority
  tokenProgram: Address             // Token-2022 program
}
```

## Token Account Management

### Creating Token Accounts with Extensions

```typescript
// Calculate space for token account with extensions
function calculateTokenAccountSpace(extensions: TokenExtension[]): number {
  let space = 165 // Base token account size
  
  for (const ext of extensions) {
    switch (ext) {
      case TokenExtension.TransferFee:
        space += 108
        break
      case TokenExtension.ConfidentialTransfer:
        space += 289
        break
      case TokenExtension.DefaultAccountState:
        space += 1
        break
      case TokenExtension.MemoTransfer:
        space += 1
        break
      case TokenExtension.ImmutableOwner:
        space += 0 // No additional space
        break
    }
  }
  
  return space
}
```

### Associated Token Accounts

```typescript
// Get or create associated token account
export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: TransactionSigner,
  mint: Address,
  owner: Address,
  allowOwnerOffCurve = false,
  commitment?: Commitment,
  programId = TOKEN_2022_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<Address> {
  const associatedToken = await getAssociatedTokenAddress(
    mint,
    owner,
    allowOwnerOffCurve,
    programId,
    associatedTokenProgramId
  )
  
  const info = await connection.getAccountInfo(associatedToken, commitment)
  
  if (!info) {
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedToken,
        owner,
        mint,
        programId,
        associatedTokenProgramId
      )
    )
    
    await sendAndConfirmTransaction(connection, transaction, [payer])
  }
  
  return associatedToken
}
```

## Integration Examples

### Complete Token Creation with Extensions

```typescript
// Create a token with transfer fees and confidential transfers
async function createAdvancedToken(): Promise<Address> {
  const mint = generateKeypair()
  
  // 1. Create mint with extensions
  const createMintIx = createCreateToken2022MintInstruction(
    {
      mint: mint.publicKey,
      mintAuthority: authority,
      payer: payer,
      tokenProgram: TOKEN_2022_PROGRAM_ID
    },
    {
      decimals: 6,
      enableTransferFee: true,
      enableConfidentialTransfers: true,
      enableInterestBearing: false,
      enableDefaultAccountState: false,
      enableMintCloseAuthority: true,
      metadata: {
        name: "GhostSpeak Token",
        symbol: "GHOST",
        uri: "https://metadata.ghostspeak.ai/token"
      }
    }
  )
  
  // 2. Initialize transfer fee
  const initFeeIx = createInitializeTransferFeeConfigInstruction(
    {
      mint: mint.publicKey,
      mintAuthority: authority,
      tokenProgram: TOKEN_2022_PROGRAM_ID
    },
    {
      transferFeeBasisPoints: 50, // 0.5%
      maximumFee: 1000000n,       // 1 token max fee
      transferFeeAuthority: feeAuthority.publicKey,
      withdrawWithheldAuthority: withdrawAuthority.publicKey
    }
  )
  
  // 3. Initialize confidential transfers
  const initConfidentialIx = createInitializeConfidentialTransferMintInstruction(
    {
      mint: mint.publicKey,
      mintAuthority: authority,
      tokenProgram: TOKEN_2022_PROGRAM_ID
    },
    {
      autoApproveNewAccounts: true,
      auditingElGamalPubkey: auditorPubkey
    }
  )
  
  // Send all instructions
  const tx = await sendTransaction([
    createMintIx,
    initFeeIx,
    initConfidentialIx
  ])
  
  return mint.publicKey
}
```

### Confidential Transfer Example

```typescript
async function performConfidentialTransfer(
  from: Address,
  to: Address,
  amount: bigint
): Promise<string> {
  // 1. Generate transfer proof
  const proof = await generateTransferProof(
    fromAccount,
    amount,
    fromElGamalKeypair
  )
  
  // 2. Encrypt amount for recipient
  const encryptedAmount = elGamalEncrypt(
    amount,
    toElGamalPubkey
  )
  
  // 3. Create transfer instruction
  const transferIx = createConfidentialTransferInstruction(
    {
      source: from,
      destination: to,
      mint: tokenMint,
      owner: owner,
      tokenProgram: TOKEN_2022_PROGRAM_ID
    },
    {
      encryptedAmount,
      transferProof: proof
    }
  )
  
  // 4. Send transaction
  return await sendTransaction([transferIx])
}
```

## Best Practices

### 1. Extension Selection
- Only enable needed extensions
- Consider gas costs of extensions
- Plan for future needs

### 2. Security
- Protect ElGamal private keys
- Validate all proofs
- Use multisig for authorities

### 3. Performance
- Batch operations when possible
- Cache extension data
- Minimize proof generation

### 4. Compliance
- Enable auditing for regulated tokens
- Implement transfer restrictions
- Maintain transaction history

## Testing

```typescript
describe('Token-2022 Instructions', () => {
  it('should calculate correct mint space', () => {
    const args = {
      enableTransferFee: true,
      enableConfidentialTransfers: true,
      enableInterestBearing: false
    }
    
    const space = calculateMintSpace(args)
    expect(space).toBe(82 + 108 + 289) // Base + extensions
  })
  
  it('should create mint with metadata', async () => {
    const instruction = createCreateToken2022MintInstruction(
      accounts,
      {
        decimals: 6,
        metadata: {
          name: "Test Token",
          symbol: "TEST",
          uri: "https://test.com"
        }
      }
    )
    
    expect(instruction.programAddress).toBe(GHOSTSPEAK_PROGRAM_ID)
    expect(instruction.accounts).toContainEqual({
      address: TOKEN_2022_PROGRAM_ID,
      role: 'readonly'
    })
  })
  
  it('should calculate transfer fees correctly', () => {
    const amount = 1000000n
    const feeBasisPoints = 50 // 0.5%
    const maximumFee = 10000n
    
    const fee = calculateTransferFee(amount, feeBasisPoints, maximumFee)
    expect(fee).toBe(5000n) // 0.5% of 1000000
  })
})