# Token-2022 Examples

This directory contains examples for using advanced Token-2022 features in the GhostSpeak protocol.

## Examples

### 1. Confidential Transfers (`confidential-transfers.ts`)
- Create confidential transfer escrows
- ElGamal encryption for amounts
- Zero-knowledge proof generation

### 2. Transfer Fees (`transfer-fees.ts`)
- Handle automatic transfer fees
- Calculate fee amounts
- Fee collection and distribution

### 3. Advanced Extensions (`advanced-extensions.ts`)
- Interest-bearing tokens
- Non-transferable tokens
- Metadata extensions

## Key Features

### Confidential Transfers
- **Amount Privacy**: Transaction amounts are hidden
- **ElGamal Encryption**: Cryptographically secure amount hiding
- **ZK Proofs**: Verify transactions without revealing amounts

### Transfer Fees
- **Automatic Collection**: Fees collected on every transfer
- **Configurable Rates**: Set custom fee percentages
- **Fee Distribution**: Automatic distribution to protocol treasury

## Running the Examples

```bash
# Install dependencies
bun install

# Run a specific example
bun run confidential-transfers.ts
bun run transfer-fees.ts

# Run all examples
bun run all
```