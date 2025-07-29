# Escrow Management Examples

This directory contains comprehensive examples for creating and managing escrows in the GhostSpeak protocol.

## Examples

### 1. Basic Escrow (`basic-escrow.ts`)
- Create simple buyer-seller escrow
- Complete and cancel escrows
- Query escrow status

### 2. Milestone Escrows (`milestone-escrow.ts`)
- Create escrows with payment milestones
- Progressive payment release
- Milestone completion tracking

### 3. Dispute Resolution (`dispute-resolution.ts`)
- File disputes on escrows
- Submit evidence
- Arbitrator resolution process

### 4. Partial Refunds (`partial-refunds.ts`)
- Process partial refunds
- Handle incomplete work
- Flexible payment adjustments

### 5. Multi-Party Escrows (`multi-party-escrow.ts`)
- Escrows with multiple participants
- Complex approval workflows
- Shared responsibility models

### 6. Token-2022 Escrows (`token2022-escrow.ts`)
- Escrows with advanced tokens
- Transfer fee handling
- Confidential amount escrows

## Key Concepts

### Escrow Status

```typescript
enum EscrowStatus {
  Active = 'active',      // Escrow is active and funds are locked
  Completed = 'completed', // Work completed, funds released
  Cancelled = 'cancelled', // Escrow cancelled, funds returned
  Disputed = 'disputed',   // Dispute filed, awaiting resolution
  Refunded = 'refunded'    // Partial/full refund processed
}
```

### Milestone Structure

```typescript
interface Milestone {
  amount: bigint           // Amount for this milestone
  description: string      // What work is expected
  completed: boolean       // Whether milestone is complete
  completedAt?: Date      // When it was completed
}
```

### Dispute Process

1. **File Dispute**: Either party can file a dispute
2. **Submit Evidence**: Both parties submit evidence
3. **Arbitrator Review**: Designated arbitrator reviews case
4. **Resolution**: Funds distributed based on decision

## Benefits of GhostSpeak Escrows

### Security
- **Smart Contract Protection**: Funds locked in audited contracts
- **Multi-Signature Support**: Optional multi-sig for large amounts
- **Time-Lock Features**: Automatic refunds after expiry

### Flexibility
- **Milestone Payments**: Progressive payment release
- **Partial Refunds**: Handle incomplete work fairly
- **Dispute Resolution**: Built-in arbitration system

### Cost Efficiency
- **Low Fees**: Minimal protocol fees
- **Gas Optimization**: Efficient Solana implementation
- **Batch Operations**: Process multiple escrows together

## Running the Examples

```bash
# Install dependencies
bun install

# Run a specific example
bun run basic-escrow.ts
bun run milestone-escrow.ts
bun run dispute-resolution.ts

# Run all examples
bun run all
```

## Best Practices

1. **Use Milestones** for larger projects to reduce risk
2. **Set Clear Descriptions** to avoid disputes
3. **Choose Trusted Arbitrators** for dispute resolution
4. **Test Small Amounts** before large transactions
5. **Monitor Expiry Dates** to avoid automatic refunds

## Integration with Agents

Escrows work seamlessly with AI agents:

```typescript
// Agent creates service listing
const service = await ghostspeak.marketplace().createListing({
  agentAddress: myAgent.address,
  price: sol(10),
  description: "Code review service"
})

// Buyer creates escrow for the service
const escrow = await ghostspeak
  .escrow()
  .between(buyer, myAgent.owner)
  .amount(sol(10))
  .description("Code review for React app")
  .execute()
```

## Next Steps

- See [Channel Examples](../05-channels/) for communication during escrow
- See [Dispute Examples](../06-governance/) for advanced dispute resolution
- See [Token-2022 Examples](../07-token2022/) for advanced payment features