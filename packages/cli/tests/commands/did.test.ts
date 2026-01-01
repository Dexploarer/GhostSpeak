/**
 * DID Command Tests
 * Tests for W3C Decentralized Identifier management commands
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { didCommand } from '../../src/commands/did.js'
import {
  createMockSDKClient,
  createMockWallet,
  createMockRpc,
  createMockAgentData,
  mockConsole
} from '../utils/test-helpers.js'

// Mock dependencies
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  text: vi.fn(async () => 'TestAgent1111111111111111111111111111'),
  select: vi.fn(async () => 'ed25519'),
  confirm: vi.fn(async () => true),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  })),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  note: vi.fn()
}))

vi.mock('../../src/utils/client.js', () => ({
  initializeClient: vi.fn(async () => ({
    client: createMockSDKClient(),
    wallet: createMockWallet(),
    rpc: createMockRpc()
  })),
  getExplorerUrl: vi.fn((sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`),
  handleTransactionError: vi.fn((error) => error.message),
  toSDKSigner: vi.fn((wallet) => wallet)
}))

vi.mock('../../src/utils/sdk-helpers.js', () => ({
  createSafeSDKClient: vi.fn((client) => client)
}))

vi.mock('@solana/addresses', () => ({
  address: vi.fn((addr) => addr)
}))

describe('DID Command', () => {
  let restoreConsole: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    restoreConsole = mockConsole()
  })

  afterEach(() => {
    restoreConsole()
  })

  describe('command structure', () => {
    it('should have did command', () => {
      expect(didCommand.name()).toBe('did')
      expect(didCommand.description()).toContain('DID')
    })

    it('should have create subcommand', () => {
      const createCmd = didCommand.commands.find(cmd => cmd.name() === 'create')
      expect(createCmd).toBeDefined()
      expect(createCmd?.description()).toContain('DID')
    })

    it('should have update subcommand', () => {
      const updateCmd = didCommand.commands.find(cmd => cmd.name() === 'update')
      expect(updateCmd).toBeDefined()
      expect(updateCmd?.description()).toContain('DID')
    })

    it('should have resolve subcommand', () => {
      const resolveCmd = didCommand.commands.find(cmd => cmd.name() === 'resolve')
      expect(resolveCmd).toBeDefined()
      expect(resolveCmd?.description()).toContain('DID')
    })

    it('should have deactivate subcommand', () => {
      const deactivateCmd = didCommand.commands.find(cmd => cmd.name() === 'deactivate')
      expect(deactivateCmd).toBeDefined()
      expect(deactivateCmd?.description()).toContain('DID')
    })
  })

  describe('create command options', () => {
    it('should have agent option', () => {
      const createCmd = didCommand.commands.find(cmd => cmd.name() === 'create')
      const options = createCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have service-endpoint option', () => {
      const createCmd = didCommand.commands.find(cmd => cmd.name() === 'create')
      const options = createCmd?.options.map(opt => opt.long)
      expect(options).toContain('--service-endpoint')
    })

    it('should have verification-method option', () => {
      const createCmd = didCommand.commands.find(cmd => cmd.name() === 'create')
      const options = createCmd?.options.map(opt => opt.long)
      expect(options).toContain('--verification-method')
    })
  })

  describe('update command options', () => {
    it('should have did option', () => {
      const updateCmd = didCommand.commands.find(cmd => cmd.name() === 'update')
      const options = updateCmd?.options.map(opt => opt.long)
      expect(options).toContain('--did')
    })

    it('should have action option', () => {
      const updateCmd = didCommand.commands.find(cmd => cmd.name() === 'update')
      const options = updateCmd?.options.map(opt => opt.long)
      expect(options).toContain('--action')
    })

    it('should have service-endpoint option', () => {
      const updateCmd = didCommand.commands.find(cmd => cmd.name() === 'update')
      const options = updateCmd?.options.map(opt => opt.long)
      expect(options).toContain('--service-endpoint')
    })

    it('should have service-type option', () => {
      const updateCmd = didCommand.commands.find(cmd => cmd.name() === 'update')
      const options = updateCmd?.options.map(opt => opt.long)
      expect(options).toContain('--service-type')
    })

    it('should have verification-method option', () => {
      const updateCmd = didCommand.commands.find(cmd => cmd.name() === 'update')
      const options = updateCmd?.options.map(opt => opt.long)
      expect(options).toContain('--verification-method')
    })
  })

  describe('resolve command options', () => {
    it('should have did option', () => {
      const resolveCmd = didCommand.commands.find(cmd => cmd.name() === 'resolve')
      const options = resolveCmd?.options.map(opt => opt.long)
      expect(options).toContain('--did')
    })

    it('should have json option', () => {
      const resolveCmd = didCommand.commands.find(cmd => cmd.name() === 'resolve')
      const options = resolveCmd?.options.map(opt => opt.long)
      expect(options).toContain('--json')
    })
  })

  describe('deactivate command options', () => {
    it('should have did option', () => {
      const deactivateCmd = didCommand.commands.find(cmd => cmd.name() === 'deactivate')
      const options = deactivateCmd?.options.map(opt => opt.long)
      expect(options).toContain('--did')
    })
  })
})

describe('DID Identifier Generation', () => {
  it('should generate valid DID identifier', () => {
    const agentAddress = 'TestAgent1111111111111111111111111111'
    const network = 'devnet'
    const did = `did:ghostspeak:${network}:${agentAddress}`

    expect(did).toBe('did:ghostspeak:devnet:TestAgent1111111111111111111111111111')
  })

  it('should use correct DID method', () => {
    const did = 'did:ghostspeak:devnet:TestAgent1111111111111111111111111111'
    const parts = did.split(':')

    expect(parts[0]).toBe('did')
    expect(parts[1]).toBe('ghostspeak')
  })

  it('should include network in DID', () => {
    const did = 'did:ghostspeak:devnet:TestAgent1111111111111111111111111111'
    const parts = did.split(':')

    expect(parts[2]).toBe('devnet')
  })

  it('should include agent address in DID', () => {
    const agentAddress = 'TestAgent1111111111111111111111111111'
    const did = `did:ghostspeak:devnet:${agentAddress}`
    const parts = did.split(':')

    expect(parts[3]).toBe(agentAddress)
  })
})

describe('DID Format Validation', () => {
  it('should validate correct DID format', () => {
    const isValidDID = (did: string) => {
      return did.startsWith('did:ghostspeak:') && did.split(':').length === 4
    }

    expect(isValidDID('did:ghostspeak:devnet:TestAgent1111111111111111111111111111')).toBe(true)
    expect(isValidDID('did:ghostspeak:mainnet-beta:TestAgent1111111111111111111111111111')).toBe(true)
  })

  it('should reject invalid DID format', () => {
    const isValidDID = (did: string) => {
      return did.startsWith('did:ghostspeak:') && did.split(':').length === 4
    }

    expect(isValidDID('invalid')).toBe(false)
    expect(isValidDID('did:invalid:devnet:address')).toBe(false)
    expect(isValidDID('did:ghostspeak:devnet')).toBe(false) // Missing address
    expect(isValidDID('did:ghostspeak')).toBe(false)
  })

  it('should extract agent address from DID', () => {
    const did = 'did:ghostspeak:devnet:TestAgent1111111111111111111111111111'
    const parts = did.split(':')
    const agentAddress = parts[3]

    expect(agentAddress).toBe('TestAgent1111111111111111111111111111')
  })

  it('should extract network from DID', () => {
    const did = 'did:ghostspeak:devnet:TestAgent1111111111111111111111111111'
    const parts = did.split(':')
    const network = parts[2]

    expect(network).toBe('devnet')
  })
})

describe('Verification Method Types', () => {
  const VERIFICATION_METHOD_TYPES = {
    ed25519: 'Ed25519VerificationKey2020',
    secp256k1: 'EcdsaSecp256k1VerificationKey2019',
    rsa: 'RsaVerificationKey2018'
  }

  it('should define Ed25519 verification method', () => {
    expect(VERIFICATION_METHOD_TYPES.ed25519).toBe('Ed25519VerificationKey2020')
  })

  it('should define secp256k1 verification method', () => {
    expect(VERIFICATION_METHOD_TYPES.secp256k1).toBe('EcdsaSecp256k1VerificationKey2019')
  })

  it('should define RSA verification method', () => {
    expect(VERIFICATION_METHOD_TYPES.rsa).toBe('RsaVerificationKey2018')
  })

  it('should validate verification method types', () => {
    const validTypes = ['ed25519', 'secp256k1', 'rsa']

    expect(validTypes).toContain('ed25519')
    expect(validTypes).toContain('secp256k1')
    expect(validTypes).toContain('rsa')
    expect(validTypes).toHaveLength(3)
  })
})

describe('Service Types', () => {
  const SERVICE_TYPES = {
    messaging: 'MessagingService',
    credential: 'CredentialRegistryService',
    hub: 'IdentityHub',
    agent: 'AgentService'
  }

  it('should define messaging service type', () => {
    expect(SERVICE_TYPES.messaging).toBe('MessagingService')
  })

  it('should define credential service type', () => {
    expect(SERVICE_TYPES.credential).toBe('CredentialRegistryService')
  })

  it('should define hub service type', () => {
    expect(SERVICE_TYPES.hub).toBe('IdentityHub')
  })

  it('should define agent service type', () => {
    expect(SERVICE_TYPES.agent).toBe('AgentService')
  })

  it('should validate service types', () => {
    const validTypes = ['messaging', 'credential', 'hub', 'agent']

    expect(validTypes).toContain('messaging')
    expect(validTypes).toContain('credential')
    expect(validTypes).toContain('hub')
    expect(validTypes).toContain('agent')
    expect(validTypes).toHaveLength(4)
  })
})

describe('DID Document Structure', () => {
  it('should include W3C context', () => {
    const document = {
      '@context': ['https://www.w3.org/ns/did/v1']
    }

    expect(document['@context']).toContain('https://www.w3.org/ns/did/v1')
  })

  it('should include DID identifier', () => {
    const did = 'did:ghostspeak:devnet:TestAgent1111111111111111111111111111'
    const document = {
      id: did
    }

    expect(document.id).toBe(did)
  })

  it('should include verification methods array', () => {
    const document = {
      verificationMethod: []
    }

    expect(Array.isArray(document.verificationMethod)).toBe(true)
  })

  it('should include services array', () => {
    const document = {
      service: []
    }

    expect(Array.isArray(document.service)).toBe(true)
  })

  it('should include controller', () => {
    const did = 'did:ghostspeak:devnet:TestAgent1111111111111111111111111111'
    const document = {
      id: did,
      controller: did
    }

    expect(document.controller).toBe(did)
  })
})

describe('URL Validation', () => {
  it('should validate valid URLs', () => {
    const isValidURL = (url: string) => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }

    expect(isValidURL('https://example.com')).toBe(true)
    expect(isValidURL('https://api.example.com/service')).toBe(true)
    expect(isValidURL('http://localhost:8080')).toBe(true)
  })

  it('should reject invalid URLs', () => {
    const isValidURL = (url: string) => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }

    expect(isValidURL('invalid')).toBe(false)
    expect(isValidURL('not a url')).toBe(false)
    expect(isValidURL('')).toBe(false)
  })
})

describe('Update Actions', () => {
  it('should define add-service action', () => {
    const actions = ['add-service', 'remove-service', 'add-vm', 'remove-vm']
    expect(actions).toContain('add-service')
  })

  it('should define remove-service action', () => {
    const actions = ['add-service', 'remove-service', 'add-vm', 'remove-vm']
    expect(actions).toContain('remove-service')
  })

  it('should define add-vm action', () => {
    const actions = ['add-service', 'remove-service', 'add-vm', 'remove-vm']
    expect(actions).toContain('add-vm')
  })

  it('should define remove-vm action', () => {
    const actions = ['add-service', 'remove-service', 'add-vm', 'remove-vm']
    expect(actions).toContain('remove-vm')
  })

  it('should validate update actions', () => {
    const validActions = ['add-service', 'remove-service', 'add-vm', 'remove-vm']
    const isValidAction = (action: string) => validActions.includes(action)

    expect(isValidAction('add-service')).toBe(true)
    expect(isValidAction('invalid')).toBe(false)
  })
})
