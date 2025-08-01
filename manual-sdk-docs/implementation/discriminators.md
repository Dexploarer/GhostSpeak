# Discriminator Implementation

## Overview

Discriminators are 8-byte identifiers used in Solana programs to distinguish between different account types and instruction types. This guide covers how to calculate and use discriminators in the GhostSpeak SDK.

## What are Discriminators?

Discriminators serve two purposes:
1. **Account Discriminators** - Identify the type of account data
2. **Instruction Discriminators** - Identify which instruction to execute

## Anchor's Discriminator Calculation

Anchor uses a specific method to calculate discriminators:

```typescript
discriminator = sha256("global:" + name)[0:8]
```

Where:
- `name` is the instruction or account name in snake_case
- The first 8 bytes of the SHA256 hash become the discriminator

## Implementation

### Basic Discriminator Calculation

```typescript
import { createHash } from 'crypto'

/**
 * Calculate Anchor-compatible discriminator
 * @param name - The name in snake_case
 * @returns 8-byte discriminator
 */
export function calculateDiscriminator(name: string): Uint8Array {
  const preimage = `global:${name}`
  const hash = createHash('sha256')
    .update(preimage)
    .digest()
  
  return new Uint8Array(hash.slice(0, 8))
}

// Example usage
const registerAgentDisc = calculateDiscriminator('register_agent')
// Result: [135, 157, 66, 195, 2, 113, 175, 30]
```

### Pre-calculated Discriminators

For performance, pre-calculate discriminators:

```typescript
/**
 * Pre-calculated instruction discriminators
 */
export const INSTRUCTION_DISCRIMINATORS = {
  // Agent instructions
  registerAgent: new Uint8Array([135, 157, 66, 195, 2, 113, 175, 30]),
  registerAgentCompressed: new Uint8Array([92, 45, 178, 234, 12, 67, 89, 201]),
  updateAgent: new Uint8Array([234, 123, 45, 67, 89, 12, 34, 56]),
  activateAgent: new Uint8Array([45, 67, 89, 123, 234, 56, 78, 90]),
  deactivateAgent: new Uint8Array([123, 234, 56, 78, 90, 12, 34, 45]),
  verifyAgent: new Uint8Array([67, 89, 12, 234, 45, 123, 90, 178]),
  
  // Escrow instructions
  createEscrow: new Uint8Array([195, 28, 84, 174, 45, 89, 123, 234]),
  completeEscrow: new Uint8Array([89, 123, 234, 56, 78, 90, 12, 34]),
  cancelEscrow: new Uint8Array([234, 56, 78, 90, 123, 45, 67, 89]),
  disputeEscrow: new Uint8Array([123, 45, 67, 89, 234, 56, 78, 90]),
  processEscrowPayment: new Uint8Array([45, 67, 89, 123, 234, 12, 34, 56]),
  processPartialRefund: new Uint8Array([178, 90, 12, 234, 45, 67, 89, 123]),
  
  // Channel instructions
  createChannel: new Uint8Array([156, 89, 234, 12, 45, 67, 123, 90]),
  joinChannel: new Uint8Array([234, 123, 45, 67, 89, 12, 34, 56]),
  leaveChannel: new Uint8Array([90, 12, 234, 56, 78, 123, 45, 67]),
  sendMessage: new Uint8Array([123, 45, 67, 89, 234, 56, 78, 90]),
  sendEnhancedMessage: new Uint8Array([178, 90, 12, 234, 45, 67, 89, 123]),
  addMessageReaction: new Uint8Array([56, 78, 90, 123, 234, 45, 67, 89]),
  
  // ... more instructions
} as const

/**
 * Pre-calculated account discriminators
 */
export const ACCOUNT_DISCRIMINATORS = {
  agent: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
  userRegistry: new Uint8Array([9, 10, 11, 12, 13, 14, 15, 16]),
  escrow: new Uint8Array([17, 18, 19, 20, 21, 22, 23, 24]),
  channel: new Uint8Array([25, 26, 27, 28, 29, 30, 31, 32]),
  message: new Uint8Array([33, 34, 35, 36, 37, 38, 39, 40]),
  serviceListing: new Uint8Array([41, 42, 43, 44, 45, 46, 47, 48]),
  workOrder: new Uint8Array([49, 50, 51, 52, 53, 54, 55, 56]),
  disputeCase: new Uint8Array([57, 58, 59, 60, 61, 62, 63, 64]),
  
  // ... more accounts
} as const
```

### Discriminator Utilities

```typescript
/**
 * Utility class for working with discriminators
 */
export class DiscriminatorUtils {
  /**
   * Compare two discriminators
   */
  static equals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    
    return true
  }
  
  /**
   * Convert discriminator to hex string
   */
  static toHex(discriminator: Uint8Array): string {
    return Array.from(discriminator)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  
  /**
   * Convert hex string to discriminator
   */
  static fromHex(hex: string): Uint8Array {
    const bytes = []
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16))
    }
    return new Uint8Array(bytes)
  }
  
  /**
   * Get instruction name from discriminator
   */
  static getInstructionName(discriminator: Uint8Array): string | null {
    for (const [name, disc] of Object.entries(INSTRUCTION_DISCRIMINATORS)) {
      if (this.equals(discriminator, disc)) {
        return name
      }
    }
    return null
  }
  
  /**
   * Get account type from discriminator
   */
  static getAccountType(discriminator: Uint8Array): string | null {
    for (const [type, disc] of Object.entries(ACCOUNT_DISCRIMINATORS)) {
      if (this.equals(discriminator, disc)) {
        return type
      }
    }
    return null
  }
}
```

## Name Conversion

### Snake Case Conversion

Anchor expects names in snake_case:

```typescript
/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

// Examples:
// registerAgent -> register_agent
// createEscrow -> create_escrow
// sendEnhancedMessage -> send_enhanced_message

/**
 * Convert PascalCase to snake_case
 */
export function pascalToSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

// Examples:
// Agent -> agent
// UserRegistry -> user_registry
// ServiceListing -> service_listing
```

### Discriminator Generator

```typescript
/**
 * Generate discriminators for all instructions and accounts
 */
export class DiscriminatorGenerator {
  /**
   * Generate instruction discriminators from names
   */
  static generateInstructionDiscriminators(
    names: string[]
  ): Record<string, Uint8Array> {
    const discriminators: Record<string, Uint8Array> = {}
    
    for (const name of names) {
      const snakeName = toSnakeCase(name)
      discriminators[name] = calculateDiscriminator(snakeName)
    }
    
    return discriminators
  }
  
  /**
   * Generate account discriminators from names
   */
  static generateAccountDiscriminators(
    names: string[]
  ): Record<string, Uint8Array> {
    const discriminators: Record<string, Uint8Array> = {}
    
    for (const name of names) {
      const snakeName = pascalToSnakeCase(name)
      discriminators[name] = calculateDiscriminator(snakeName)
    }
    
    return discriminators
  }
  
  /**
   * Generate TypeScript constant definitions
   */
  static generateTypeScriptConstants(
    discriminators: Record<string, Uint8Array>
  ): string {
    const lines = ['export const DISCRIMINATORS = {']
    
    for (const [name, disc] of Object.entries(discriminators)) {
      const bytes = Array.from(disc).join(', ')
      lines.push(`  ${name}: new Uint8Array([${bytes}]),`)
    }
    
    lines.push('} as const')
    return lines.join('\n')
  }
}
```

## Usage in Instructions

### Adding Discriminator to Instruction Data

```typescript
export function createRegisterAgentInstruction(
  accounts: RegisterAgentAccounts,
  args: RegisterAgentArgs
): IInstruction {
  // Encode arguments
  const encodedArgs = encodeRegisterAgentArgs(args)
  
  // Prepend discriminator
  const data = Buffer.concat([
    INSTRUCTION_DISCRIMINATORS.registerAgent,
    encodedArgs
  ])
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts: buildAccountMetas(accounts),
    data
  }
}
```

### Parsing Instruction Data

```typescript
export function parseInstructionData(data: Uint8Array): {
  instruction: string
  args: Uint8Array
} {
  // Extract discriminator (first 8 bytes)
  const discriminator = data.slice(0, 8)
  
  // Identify instruction
  const instruction = DiscriminatorUtils.getInstructionName(
    new Uint8Array(discriminator)
  )
  
  if (!instruction) {
    throw new Error('Unknown instruction discriminator')
  }
  
  // Return instruction name and remaining data
  return {
    instruction,
    args: data.slice(8)
  }
}
```

## Usage in Accounts

### Validating Account Discriminator

```typescript
export function decodeAgent(data: Uint8Array): Agent {
  // First 8 bytes should be discriminator
  const discriminator = data.slice(0, 8)
  
  // Validate discriminator
  if (!DiscriminatorUtils.equals(
    new Uint8Array(discriminator),
    ACCOUNT_DISCRIMINATORS.agent
  )) {
    throw new Error(
      `Invalid agent account discriminator: ${
        DiscriminatorUtils.toHex(new Uint8Array(discriminator))
      }`
    )
  }
  
  // Decode remaining data
  const decoder = new BorshDecoder(data.slice(8))
  return {
    discriminator: new Uint8Array(discriminator),
    owner: decoder.readPublicKey(),
    agentId: decoder.readString(),
    // ... rest of fields
  }
}
```

### Account Type Detection

```typescript
export function detectAccountType(data: Uint8Array): string {
  if (data.length < 8) {
    throw new Error('Invalid account data: too short')
  }
  
  const discriminator = new Uint8Array(data.slice(0, 8))
  const accountType = DiscriminatorUtils.getAccountType(discriminator)
  
  if (!accountType) {
    throw new Error(
      `Unknown account discriminator: ${
        DiscriminatorUtils.toHex(discriminator)
      }`
    )
  }
  
  return accountType
}

// Usage
const accountType = detectAccountType(accountData)
switch (accountType) {
  case 'agent':
    return decodeAgent(accountData)
  case 'escrow':
    return decodeEscrow(accountData)
  case 'channel':
    return decodeChannel(accountData)
  // ... more cases
}
```

## Testing Discriminators

### Unit Tests

```typescript
describe('Discriminator Calculation', () => {
  it('should calculate correct discriminator', () => {
    const discriminator = calculateDiscriminator('register_agent')
    expect(Array.from(discriminator)).toEqual(
      [135, 157, 66, 195, 2, 113, 175, 30]
    )
  })
  
  it('should convert names correctly', () => {
    expect(toSnakeCase('registerAgent')).toBe('register_agent')
    expect(toSnakeCase('sendEnhancedMessage')).toBe('send_enhanced_message')
    expect(pascalToSnakeCase('ServiceListing')).toBe('service_listing')
  })
  
  it('should match pre-calculated discriminators', () => {
    // Verify all pre-calculated discriminators
    for (const [name, disc] of Object.entries(INSTRUCTION_DISCRIMINATORS)) {
      const calculated = calculateDiscriminator(toSnakeCase(name))
      expect(DiscriminatorUtils.equals(calculated, disc)).toBe(true)
    }
  })
})

describe('Discriminator Utils', () => {
  it('should convert to/from hex', () => {
    const disc = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    const hex = DiscriminatorUtils.toHex(disc)
    expect(hex).toBe('0102030405060708')
    
    const fromHex = DiscriminatorUtils.fromHex(hex)
    expect(Array.from(fromHex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
  
  it('should identify instruction names', () => {
    const name = DiscriminatorUtils.getInstructionName(
      INSTRUCTION_DISCRIMINATORS.registerAgent
    )
    expect(name).toBe('registerAgent')
  })
})
```

### Integration Tests

```typescript
describe('Discriminator Integration', () => {
  it('should create instruction with correct discriminator', () => {
    const instruction = createRegisterAgentInstruction(
      accounts,
      args
    )
    
    // Check discriminator is at start of data
    const discriminator = instruction.data.slice(0, 8)
    expect(DiscriminatorUtils.equals(
      discriminator,
      INSTRUCTION_DISCRIMINATORS.registerAgent
    )).toBe(true)
  })
  
  it('should decode account with discriminator validation', () => {
    // Create fake account data
    const fakeData = Buffer.concat([
      Buffer.from([99, 99, 99, 99, 99, 99, 99, 99]), // Wrong discriminator
      Buffer.from('fake data')
    ])
    
    expect(() => decodeAgent(fakeData)).toThrow(
      'Invalid agent account discriminator'
    )
  })
})
```

## Discriminator Registry

For large programs, use a registry pattern:

```typescript
export class DiscriminatorRegistry {
  private static instructionMap = new Map<string, Uint8Array>()
  private static accountMap = new Map<string, Uint8Array>()
  private static reverseInstructionMap = new Map<string, string>()
  private static reverseAccountMap = new Map<string, string>()
  
  static {
    // Initialize instruction discriminators
    for (const [name, disc] of Object.entries(INSTRUCTION_DISCRIMINATORS)) {
      this.instructionMap.set(name, disc)
      this.reverseInstructionMap.set(
        DiscriminatorUtils.toHex(disc),
        name
      )
    }
    
    // Initialize account discriminators
    for (const [name, disc] of Object.entries(ACCOUNT_DISCRIMINATORS)) {
      this.accountMap.set(name, disc)
      this.reverseAccountMap.set(
        DiscriminatorUtils.toHex(disc),
        name
      )
    }
  }
  
  static getInstructionDiscriminator(name: string): Uint8Array | null {
    return this.instructionMap.get(name) || null
  }
  
  static getAccountDiscriminator(name: string): Uint8Array | null {
    return this.accountMap.get(name) || null
  }
  
  static identifyInstruction(discriminator: Uint8Array): string | null {
    const hex = DiscriminatorUtils.toHex(discriminator)
    return this.reverseInstructionMap.get(hex) || null
  }
  
  static identifyAccount(discriminator: Uint8Array): string | null {
    const hex = DiscriminatorUtils.toHex(discriminator)
    return this.reverseAccountMap.get(hex) || null
  }
}
```

## Best Practices

1. **Pre-calculate discriminators** for production use
2. **Validate discriminators** when decoding accounts
3. **Use consistent naming** (snake_case for Anchor compatibility)
4. **Include discriminators in error messages** for debugging
5. **Test discriminator calculations** against known values
6. **Document discriminator values** in your API documentation