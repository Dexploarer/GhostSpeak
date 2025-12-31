/**
 * DID Operations Example
 *
 * Demonstrates how to:
 * - Create a DID document
 * - Add verification methods
 * - Add service endpoints
 * - Update DID
 * - Export to W3C format
 * - Deactivate DID
 *
 * Run with: bun run examples/did-operations.ts
 */

import { GhostSpeakClient } from '../src/index.js'
import { generateKeyPairSigner } from '@solana/signers'
import {
  VerificationMethodType,
  VerificationRelationship,
  ServiceEndpointType,
} from '../src/modules/did/did-types.js'

async function runDidOperations() {
  console.log('🚀 GhostSpeak DID Operations Example\n')

  // ============================================================================
  // 1. Initialize Client
  // ============================================================================
  console.log('1️⃣  Initializing GhostSpeak client...')

  const client = new GhostSpeakClient({
    cluster: 'devnet'
  })

  // Create agent keypair
  const agentSigner = await generateKeyPairSigner()
  console.log('   Agent address:', agentSigner.address)
  console.log('   ✅ Client initialized\n')

  // ============================================================================
  // 2. Create DID Document
  // ============================================================================
  console.log('2️⃣  Creating DID document...')

  const didString = client.did.generateDid(agentSigner.address, 'devnet')
  console.log('   DID:', didString)

  try {
    const createSignature = await client.did.create(agentSigner, {
      controller: agentSigner.address,
      network: 'devnet',

      // Initial authentication key
      verificationMethods: [{
        id: 'auth-key-1',
        methodType: VerificationMethodType.Ed25519VerificationKey2020,
        controller: didString,
        publicKeyMultibase: `z${agentSigner.address}`, // Simplified for example
        relationships: [VerificationRelationship.Authentication],
        createdAt: Math.floor(Date.now() / 1000),
        revoked: false
      }],

      // Initial service endpoint
      serviceEndpoints: [{
        id: 'agent-api',
        serviceType: ServiceEndpointType.AIAgentService,
        serviceEndpoint: 'https://my-agent.example.com/api',
        description: 'AI Agent Service API'
      }]
    })

    console.log('   ✅ DID created')
    console.log('   Transaction:', createSignature, '\n')
  } catch (error) {
    console.error('   ❌ Error creating DID:', error)
    return
  }

  // ============================================================================
  // 3. Resolve DID Document
  // ============================================================================
  console.log('3️⃣  Resolving DID document...')

  const didDoc = await client.did.resolve(agentSigner.address)

  if (didDoc) {
    console.log('   DID:', didDoc.did)
    console.log('   Controller:', didDoc.controller)
    console.log('   Verification Methods:', didDoc.verificationMethods.length)
    console.log('   Service Endpoints:', didDoc.serviceEndpoints.length)
    console.log('   Active:', !didDoc.deactivated)
    console.log('   Created:', new Date(didDoc.createdAt * 1000).toISOString())
    console.log('   ✅ DID resolved\n')
  } else {
    console.log('   ❌ DID not found\n')
    return
  }

  // ============================================================================
  // 4. Add Verification Method (Encryption Key)
  // ============================================================================
  console.log('4️⃣  Adding encryption verification method...')

  const [didPda] = await client.did.deriveDidPda(agentSigner.address)
  console.log('   DID PDA:', didPda)

  try {
    const updateSignature = await client.did.update(agentSigner, {
      didDocument: didPda,
      addVerificationMethod: {
        id: 'encrypt-key-1',
        methodType: VerificationMethodType.X25519KeyAgreementKey2020,
        controller: didString,
        publicKeyMultibase: 'z6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc',
        relationships: [VerificationRelationship.KeyAgreement],
        createdAt: Math.floor(Date.now() / 1000),
        revoked: false
      }
    })

    console.log('   ✅ Encryption key added')
    console.log('   Transaction:', updateSignature, '\n')
  } catch (error) {
    console.error('   ❌ Error adding verification method:', error)
  }

  // ============================================================================
  // 5. Add Service Endpoints
  // ============================================================================
  console.log('5️⃣  Adding additional service endpoints...')

  try {
    // Add credential repository
    await client.did.update(agentSigner, {
      didDocument: didPda,
      addServiceEndpoint: {
        id: 'credentials',
        serviceType: ServiceEndpointType.CredentialRepository,
        serviceEndpoint: 'https://my-agent.example.com/credentials',
        description: 'Verifiable Credentials Repository'
      }
    })
    console.log('   ✅ Credential repository endpoint added')

    // Add DIDComm messaging
    await client.did.update(agentSigner, {
      didDocument: didPda,
      addServiceEndpoint: {
        id: 'messaging',
        serviceType: ServiceEndpointType.DIDCommMessaging,
        serviceEndpoint: 'https://my-agent.example.com/didcomm',
        description: 'DIDComm Messaging Endpoint'
      }
    })
    console.log('   ✅ DIDComm messaging endpoint added\n')
  } catch (error) {
    console.error('   ❌ Error adding service endpoints:', error)
  }

  // ============================================================================
  // 6. Resolve Updated DID
  // ============================================================================
  console.log('6️⃣  Resolving updated DID document...')

  const updatedDidDoc = await client.did.resolve(agentSigner.address)

  if (updatedDidDoc) {
    console.log('   Verification Methods:', updatedDidDoc.verificationMethods.length)
    updatedDidDoc.verificationMethods.forEach((method, i) => {
      console.log(`     ${i + 1}. ${method.id} (${method.methodType})`)
      console.log(`        Relationships: ${method.relationships.join(', ')}`)
    })

    console.log('   Service Endpoints:', updatedDidDoc.serviceEndpoints.length)
    updatedDidDoc.serviceEndpoints.forEach((service, i) => {
      console.log(`     ${i + 1}. ${service.id} (${service.serviceType})`)
      console.log(`        URL: ${service.serviceEndpoint}`)
    })

    console.log('   ✅ DID updated successfully\n')
  }

  // ============================================================================
  // 7. Export to W3C Format
  // ============================================================================
  console.log('7️⃣  Exporting DID to W3C format...')

  const w3cJson = await client.did.exportW3C(agentSigner.address, true)

  if (w3cJson) {
    console.log('   W3C DID Document:')
    console.log(w3cJson)
    console.log('   ✅ Exported to W3C format\n')

    // Can also get as object
    const w3cDoc = await client.did.getW3CDocument(agentSigner.address)
    if (w3cDoc) {
      console.log('   W3C Context:', w3cDoc['@context'])
      console.log('   W3C ID:', w3cDoc.id)
    }
  }

  // ============================================================================
  // 8. Validate DID
  // ============================================================================
  console.log('8️⃣  Validating DID...')

  try {
    const isValid = client.did.validateDid(didString)
    console.log('   ✅ DID is valid:', isValid)

    const isActive = await client.did.isActive(agentSigner.address)
    console.log('   ✅ DID is active:', isActive, '\n')
  } catch (error) {
    console.error('   ❌ DID validation failed:', error)
  }

  // ============================================================================
  // 9. Remove Service Endpoint
  // ============================================================================
  console.log('9️⃣  Removing old service endpoint...')

  try {
    await client.did.update(agentSigner, {
      didDocument: didPda,
      removeServiceEndpointId: 'agent-api'
    })
    console.log('   ✅ Old endpoint removed\n')
  } catch (error) {
    console.error('   ❌ Error removing endpoint:', error)
  }

  // ============================================================================
  // 10. Deactivate DID (Optional - Commented Out)
  // ============================================================================
  console.log('🔟 Deactivation (skipped in example)')
  console.log('   To deactivate DID permanently:')
  console.log('   await client.did.deactivate(agentSigner, { didDocument: didPda })')
  console.log('   ⚠️  WARNING: Deactivation is IRREVERSIBLE!\n')

  /*
  // Uncomment to actually deactivate
  try {
    const deactivateSignature = await client.did.deactivate(agentSigner, {
      didDocument: didPda
    })
    console.log('   DID deactivated:', deactivateSignature)

    const stillActive = await client.did.isActive(agentSigner.address)
    console.log('   Is active:', stillActive) // Should be false
  } catch (error) {
    console.error('   Error deactivating DID:', error)
  }
  */

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('✅ DID Operations Example Complete!\n')
  console.log('Summary:')
  console.log('- Created DID document')
  console.log('- Added verification methods (auth + encryption)')
  console.log('- Added service endpoints (API, credentials, messaging)')
  console.log('- Exported to W3C format')
  console.log('- Validated DID')
  console.log('\nNext steps:')
  console.log('- Use DID for verifiable credentials')
  console.log('- Export W3C format for cross-chain verification')
  console.log('- Integrate with agent identity system')
}

// Run example
runDidOperations().catch(console.error)
