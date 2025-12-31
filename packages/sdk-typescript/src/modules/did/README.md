# GhostSpeak DID Module

Decentralized Identifier (DID) management for the GhostSpeak protocol, implementing the W3C DID Core specification and the `did:sol` method for Solana.

## Overview

The DID module provides type-safe, comprehensive functionality for:

- Creating and managing DIDs on Solana
- W3C-compliant DID document export
- Verification method management
- Service endpoint registration
- Integration with Verifiable Credentials

## Installation

The DID module is included in the GhostSpeak SDK:

```bash
bun add @ghostspeak/sdk
```

## Quick Start

```typescript
import { GhostSpeakClient, generateKeyPairSigner } from '@ghostspeak/sdk'

// Initialize client
const client = new GhostSpeakClient({ cluster: 'devnet' })
const signer = await generateKeyPairSigner()

// Create a DID
const signature = await client.did().create(signer, {
  controller: signer.address,
  network: 'devnet'
})

// Resolve a DID
const didDoc = await client.did().resolve(signer.address)

// Export as W3C format
const w3cJson = await client.did().exportW3C(signer.address, true)
console.log(w3cJson)
```

## Features

### DID Creation

Create a new DID document with optional verification methods and service endpoints:

```typescript
import {
  VerificationMethodType,
  VerificationRelationship,
  ServiceEndpointType,
  createEd25519VerificationMethod,
  createServiceEndpoint
} from '@ghostspeak/sdk'

const didModule = client.did()

// Create a DID with verification methods
const signature = await didModule.create(signer, {
  controller: signer.address,
  network: 'devnet',
  verificationMethods: [
    createEd25519VerificationMethod(
      'key-1',
      'did:sol:devnet:' + signer.address,
      signer.address,
      [
        VerificationRelationship.Authentication,
        VerificationRelationship.AssertionMethod
      ]
    )
  ],
  serviceEndpoints: [
    createServiceEndpoint(
      'agent-api',
      ServiceEndpointType.AIAgentService,
      'https://my-agent.example.com/api',
      'AI agent service endpoint'
    )
  ]
})
```

### DID Resolution

Resolve DIDs by controller address or DID string:

```typescript
// Resolve by controller address
const didDoc1 = await didModule.resolve(signer.address)

// Resolve by DID string
const didDoc2 = await didModule.resolve('did:sol:devnet:HN7cABqLq46...')

// Check if active
const isActive = await didModule.isActive(signer.address)
```

### DID Updates

Add or remove verification methods and service endpoints:

```typescript
const updateSig = await didModule.update(signer, {
  didDocument: didPda,
  addVerificationMethod: createEd25519VerificationMethod(
    'key-2',
    'did:sol:devnet:' + signer.address,
    newPublicKey,
    [VerificationRelationship.KeyAgreement]
  ),
  addServiceEndpoint: createServiceEndpoint(
    'messaging',
    ServiceEndpointType.DIDCommMessaging,
    'https://my-agent.example.com/didcomm'
  )
})
```

### DID Deactivation

Deactivate a DID (irreversible):

```typescript
const deactivateSig = await didModule.deactivate(signer, {
  didDocument: didPda
})
```

### W3C Export

Export DIDs in W3C-compliant format:

```typescript
// Get W3C document object
const w3cDoc = await didModule.getW3CDocument(signer.address)

// Get W3C JSON string
const w3cJson = await didModule.exportW3C(signer.address, true)

// Parse and use
const doc = JSON.parse(w3cJson)
console.log(doc.id) // "did:sol:devnet:HN7cABqLq46..."
console.log(doc.verificationMethod) // Array of verification methods
```

### DID Helpers

Utility functions for DID operations:

```typescript
import {
  generateDidString,
  validateDidString,
  parseDidString,
  deriveDidDocumentPda
} from '@ghostspeak/sdk'

// Generate a DID string
const did = generateDidString('devnet', myAddress)
// Returns: "did:sol:devnet:HN7cABqLq46..."

// Validate DID format
try {
  validateDidString(did)
  console.log('Valid DID')
} catch (error) {
  console.error('Invalid DID:', error.message)
}

// Parse DID into components
const { method, network, identifier } = parseDidString(did)
// { method: 'sol', network: 'devnet', identifier: 'HN7cABqLq46...' }

// Derive PDA
const [didPda, bump] = await deriveDidDocumentPda(programId, controller)
```

## Integration with Verifiable Credentials

The DID module integrates seamlessly with the Credential module:

```typescript
import { CredentialModule } from '@ghostspeak/sdk'

const credModule = new CredentialModule(programId, client.did())

// Credentials automatically use DIDs for issuer and subject
const result = credModule.issueX402AgentCredential({
  agentAddress: agentPda,
  agentId: 'my-agent',
  owner: signer.address,
  name: 'My AI Agent',
  serviceEndpoint: 'https://my-agent.example.com',
  frameworkOrigin: 'ghostspeak',
  x402PaymentAddress: paymentAddress,
  x402AcceptedTokens: [usdcMint],
  x402PricePerCall: '1000000',
  network: 'devnet'
})

// The credential now has proper DIDs:
console.log(result.w3cCredential.issuer.id) // "did:sol:devnet:GHosT..."
console.log(result.w3cCredential.credentialSubject.id) // "did:sol:devnet:HN7cA..."
```

## Advanced Usage

### Custom Verification Methods

Create custom verification methods for different cryptographic algorithms:

```typescript
import { VerificationMethodType } from '@ghostspeak/sdk'

// X25519 for key agreement (encryption)
const keyAgreementMethod = {
  id: 'x25519-key-1',
  methodType: VerificationMethodType.X25519KeyAgreementKey2020,
  controller: didString,
  publicKeyMultibase: 'z...',
  relationships: [VerificationRelationship.KeyAgreement],
  createdAt: Date.now() / 1000,
  revoked: false
}

// ECDSA for Ethereum compatibility
const ethereumMethod = {
  id: 'eth-key-1',
  methodType: VerificationMethodType.EcdsaSecp256k1VerificationKey2019,
  controller: didString,
  publicKeyMultibase: 'z...',
  relationships: [VerificationRelationship.Authentication],
  createdAt: Date.now() / 1000,
  revoked: false
}
```

### Service Endpoints

Register various service types:

```typescript
import { ServiceEndpointType } from '@ghostspeak/sdk'

const services = [
  createServiceEndpoint(
    'agent-api',
    ServiceEndpointType.AIAgentService,
    'https://agent.example.com/api'
  ),
  createServiceEndpoint(
    'didcomm',
    ServiceEndpointType.DIDCommMessaging,
    'https://agent.example.com/didcomm'
  ),
  createServiceEndpoint(
    'credentials',
    ServiceEndpointType.CredentialRepository,
    'https://agent.example.com/credentials'
  ),
  createServiceEndpoint(
    'website',
    ServiceEndpointType.LinkedDomains,
    'https://agent.example.com'
  )
]
```

## Architecture

The DID module follows a clean, modular architecture:

```
did/
├── did-types.ts       # TypeScript types matching Rust structs
├── did-helpers.ts     # Utility functions (PDA, validation, W3C export)
├── DidModule.ts       # Main module class with CRUD operations
└── index.ts          # Public API exports
```

## Important Notes

### Code Generation Required

**Note:** The DID instructions are not yet generated from the Anchor IDL. Before using this module in production:

1. Add DID instruction handlers to the Rust program's `lib.rs`
2. Build the program: `bun run build:programs`
3. Generate TypeScript clients: `bun run generate:client`

The module is currently structured to work with manual instruction building as a placeholder.

### Network Compatibility

The module supports all Solana networks:
- `mainnet-beta` (mainnet)
- `devnet`
- `testnet`
- `localnet`

DIDs are network-specific: `did:sol:devnet:...` vs `did:sol:mainnet-beta:...`

### W3C Compliance

All exported DIDs follow:
- W3C DID Core v1.0 specification
- `did:sol` method specification v3.0
- W3C Verifiable Credentials Data Model v2.0

## Examples

See the [examples directory](../../examples/dids/) for complete working examples:

- Basic DID creation and resolution
- Verification method management
- Service endpoint registration
- W3C export and verification
- Credential integration

## API Reference

### DidModule

```typescript
class DidModule extends BaseModule {
  // Create a DID
  create(signer: TransactionSigner, params: CreateDidDocumentParams): Promise<string>

  // Update a DID
  update(signer: TransactionSigner, params: UpdateDidDocumentParams): Promise<string>

  // Deactivate a DID
  deactivate(signer: TransactionSigner, params: DeactivateDidDocumentParams): Promise<string>

  // Resolve a DID
  resolve(didOrController: string | Address): Promise<DidDocument | null>

  // Export as W3C format
  exportW3C(didOrController: string | Address, pretty?: boolean): Promise<string | null>

  // Get W3C document object
  getW3CDocument(didOrController: string | Address): Promise<W3CDidDocument | null>

  // Helpers
  deriveDidPda(controller: Address): Promise<[Address, number]>
  generateDid(controller: Address, network?: 'mainnet' | 'devnet' | 'testnet'): string
  validateDid(did: string): boolean
  isActive(didOrController: string | Address): Promise<boolean>
}
```

## License

Apache 2.0

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../../../CONTRIBUTING.md) for guidelines.
