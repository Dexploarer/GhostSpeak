/**
 * DID Test Fixtures
 *
 * Reusable test data for DID tests
 */

import { address, type Address } from '@solana/addresses'

export interface TestVerificationMethod {
  id: string
  methodType: string
  controller: string
  publicKeyMultibase: string
  relationships: string[]
  createdAt: number
  revoked: boolean
}

export interface TestServiceEndpoint {
  id: string
  serviceType: string
  serviceEndpoint: string
  description: string
}

export interface TestDidDocument {
  did: string
  controller: Address
  verificationMethods: TestVerificationMethod[]
  serviceEndpoints: TestServiceEndpoint[]
  context: string[]
  alsoKnownAs: string[]
  createdAt: number
  updatedAt: number
  version: number
  deactivated: boolean
  deactivatedAt?: number
  bump: number
}

/**
 * Create a mock controller address
 */
export function createMockController(): Address {
  return address('HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH')
}

/**
 * Create a mock DID string
 */
export function createMockDidString(network = 'devnet'): string {
  const controller = createMockController()
  return `did:sol:${network}:${controller}`
}

/**
 * Create a mock verification method
 */
export function createMockVerificationMethod(overrides: Partial<TestVerificationMethod> = {}): TestVerificationMethod {
  const controller = createMockController()
  const now = Math.floor(Date.now() / 1000)

  return {
    id: overrides.id || 'key-1',
    methodType: overrides.methodType || 'Ed25519VerificationKey2020',
    controller: overrides.controller || `did:sol:devnet:${controller}`,
    publicKeyMultibase: overrides.publicKeyMultibase || 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
    relationships: overrides.relationships || ['authentication'],
    createdAt: overrides.createdAt || now,
    revoked: overrides.revoked || false,
  }
}

/**
 * Create a mock service endpoint
 */
export function createMockServiceEndpoint(overrides: Partial<TestServiceEndpoint> = {}): TestServiceEndpoint {
  return {
    id: overrides.id || 'agent-api',
    serviceType: overrides.serviceType || 'AIAgentService',
    serviceEndpoint: overrides.serviceEndpoint || 'https://example.com/agent',
    description: overrides.description || 'AI Agent API endpoint',
  }
}

/**
 * Create a complete mock DID document
 */
export function createMockDidDocument(overrides: Partial<TestDidDocument> = {}): TestDidDocument {
  const controller = createMockController()
  const now = Math.floor(Date.now() / 1000)
  const did = overrides.did || `did:sol:devnet:${controller}`

  return {
    did,
    controller: overrides.controller || controller,
    verificationMethods: overrides.verificationMethods || [createMockVerificationMethod()],
    serviceEndpoints: overrides.serviceEndpoints || [createMockServiceEndpoint()],
    context: overrides.context || [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
    alsoKnownAs: overrides.alsoKnownAs || [],
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    version: overrides.version || 1,
    deactivated: overrides.deactivated || false,
    deactivatedAt: overrides.deactivatedAt,
    bump: overrides.bump || 255,
  }
}

/**
 * Valid DID strings for testing
 */
export const VALID_DID_STRINGS = [
  'did:sol:devnet:5VKz2xFcsgBtJQKT6o3RgDGgBwWNd4rk8cKoqhp9pump',
  'did:sol:mainnet-beta:HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
  'did:sol:testnet:11111111111111111111111111111111',
  'did:sol:localnet:TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
]

/**
 * Invalid DID strings for testing
 */
export const INVALID_DID_STRINGS = [
  '',
  'did:sol:',
  'did:eth:mainnet:0x123',
  'did:sol:invalidnet:5VKz2xFcsgBtJQKT6o3RgDGgBwWNd4rk8cKoqhp9pump',
  'did:sol:devnet',
  'not-a-did',
  'sol:devnet:5VKz2xFcsgBtJQKT6o3RgDGgBwWNd4rk8cKoqhp9pump',
]
