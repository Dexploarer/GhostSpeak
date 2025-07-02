# Web3.js v2 Complete Type Inventory

## Overview
This document catalogs all 76 available exports from `@solana/web3.js` v2.1.1 as of 2025.

## Core Types

### Account Management
- **Account** - Base account structure
- **PublicKey** - 32-byte public key representation
- **Keypair** - Key pair for signing transactions
- **Authorized** - Stake authorization structure

### Transaction System
- **Transaction** - Complete transaction structure
- **TransactionInstruction** - Individual instruction within a transaction
- **TransactionMessage** - Message format for transactions
- **VersionedTransaction** - Versioned transaction format
- **Message** - Legacy message format
- **MessageV0** - Version 0 message format
- **MessageAccountKeys** - Account keys in transaction message

### Connection & RPC
- **Connection** - RPC connection to Solana cluster
- **clusterApiUrl** - Helper to get cluster API URLs

### Program IDs & Constants
- **BPF_LOADER_PROGRAM_ID** - BPF loader program
- **BPF_LOADER_DEPRECATED_PROGRAM_ID** - Deprecated BPF loader
- **SYSTEM_PROGRAM_ID** - System program
- **VOTE_PROGRAM_ID** - Vote program
- **SYSVAR_CLOCK_PUBKEY** - Clock sysvar
- **SYSVAR_EPOCH_SCHEDULE_PUBKEY** - Epoch schedule sysvar
- **SYSVAR_INSTRUCTIONS_PUBKEY** - Instructions sysvar
- **SYSVAR_RECENT_BLOCKHASHES_PUBKEY** - Recent blockhashes sysvar
- **SYSVAR_RENT_PUBKEY** - Rent sysvar
- **SYSVAR_REWARDS_PUBKEY** - Rewards sysvar
- **SYSVAR_SLOT_HASHES_PUBKEY** - Slot hashes sysvar
- **SYSVAR_SLOT_HISTORY_PUBKEY** - Slot history sysvar
- **SYSVAR_STAKE_HISTORY_PUBKEY** - Stake history sysvar
- **VALIDATOR_INFO_KEY** - Validator info key

### System Instructions
- **SystemInstruction** - System program instructions
- **SystemProgram** - System program utilities
- **StakeInstruction** - Stake program instructions
- **StakeProgram** - Stake program utilities
- **VoteInstruction** - Vote program instructions
- **VoteProgram** - Vote program utilities

### Address Lookup Tables
- **AddressLookupTableAccount** - Address lookup table account
- **AddressLookupTableInstruction** - Address lookup table instructions
- **AddressLookupTableProgram** - Address lookup table program

### Compute Budget
- **ComputeBudgetInstruction** - Compute budget instructions
- **ComputeBudgetProgram** - Compute budget program
- **COMPUTE_BUDGET_INSTRUCTION_LAYOUTS** - Instruction layouts

### Specialized Programs
- **BpfLoader** - BPF loader utilities
- **Ed25519Program** - Ed25519 program
- **Secp256k1Program** - Secp256k1 program

### Account Types
- **NonceAccount** - Nonce account structure
- **VoteAccount** - Vote account structure
- **ValidatorInfo** - Validator information
- **VoteInit** - Vote initialization

### Authorization & Security
- **StakeAuthorizationLayout** - Stake authorization layout
- **VoteAuthorizationLayout** - Vote authorization layout
- **Lockup** - Lockup structure

### Transaction Status & Errors
- **TransactionStatus** - Transaction status enumeration
- **SendTransactionError** - Send transaction error
- **SolanaJSONRPCError** - JSON-RPC error
- **SolanaJSONRPCErrorCode** - JSON-RPC error codes
- **TransactionExpiredBlockheightExceededError** - Blockheight exceeded error
- **TransactionExpiredNonceInvalidError** - Nonce invalid error
- **TransactionExpiredTimeoutError** - Timeout error

### Data Structures
- **Enum** - Enumeration utility
- **Struct** - Structure utility
- **EpochSchedule** - Epoch schedule structure
- **FeeCalculatorLayout** - Fee calculator layout
- **Loader** - Loader utility

### Constants
- **LAMPORTS_PER_SOL** - Lamports per SOL (1e9)
- **MAX_SEED_LENGTH** - Maximum seed length (32)
- **NONCE_ACCOUNT_LENGTH** - Nonce account length
- **PACKET_DATA_SIZE** - Packet data size (1232)
- **PUBLIC_KEY_LENGTH** - Public key length (32)
- **SIGNATURE_LENGTH_IN_BYTES** - Signature length (64)
- **BLOCKHASH_CACHE_TIMEOUT_MS** - Blockhash cache timeout

### Layouts & Schemas
- **SYSTEM_INSTRUCTION_LAYOUTS** - System instruction layouts
- **STAKE_INSTRUCTION_LAYOUTS** - Stake instruction layouts
- **LOOKUP_TABLE_INSTRUCTION_LAYOUTS** - Lookup table instruction layouts
- **SOLANA_SCHEMA** - Solana schema definition

### Utility Functions
- **sendAndConfirmRawTransaction** - Send and confirm raw transaction
- **sendAndConfirmTransaction** - Send and confirm transaction

### Versioning
- **VERSION_PREFIX_MASK** - Version prefix mask
- **VersionedMessage** - Versioned message format

## Usage Examples

### Basic Transaction
```typescript
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Keypair 
} from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const payer = Keypair.generate();
const transaction = new Transaction();
```

### Account Creation
```typescript
import { 
  SystemProgram, 
  PublicKey, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

const newAccount = Keypair.generate();
const createAccountIx = SystemProgram.createAccount({
  fromPubkey: payer.publicKey,
  newAccountPubkey: newAccount.publicKey,
  lamports: LAMPORTS_PER_SOL,
  space: 0,
  programId: SystemProgram.programId
});
```

### Address Lookup Tables
```typescript
import { 
  AddressLookupTableProgram,
  AddressLookupTableAccount 
} from '@solana/web3.js';

const lookupTable = new AddressLookupTableAccount({
  key: PublicKey.unique(),
  addresses: [new PublicKey('...')]
});
```

## Migration Notes

### From Web3.js v1
- `AccountInfo` → Use `Account` or custom interfaces
- `clusterApiUrl()` → Still available, unchanged
- `sendAndConfirmTransaction()` → Still available, unchanged
- `Connection` → API largely unchanged
- `PublicKey` → API unchanged
- `Keypair` → API unchanged

### New in v2
- **Address Lookup Tables** - New program for address compression
- **Compute Budget Program** - Explicit compute budget management
- **Versioned Transactions** - Support for transaction versioning
- **Enhanced Error Types** - More specific error handling

## Best Practices

1. **Use TypeScript** - All types are fully typed
2. **Import Specifically** - Import only what you need
3. **Handle Errors** - Use specific error types for better error handling
4. **Use Constants** - Use provided constants instead of magic numbers
5. **Versioned Transactions** - Use versioned transactions for new features

## Performance Considerations

- **Connection Pooling** - Reuse connection instances
- **Batch Operations** - Use batch RPC calls when possible
- **Address Lookup Tables** - Use for frequently accessed addresses
- **Compute Budget** - Set appropriate compute budgets for complex operations 