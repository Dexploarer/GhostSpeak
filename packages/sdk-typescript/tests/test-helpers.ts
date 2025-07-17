import { vi } from 'vitest'
import { 
  generateKeyPairSigner,
  lamports,
  address
} from '@solana/kit'
import type { Mock } from 'vitest'
import type { TransactionSigner, Address } from '@solana/kit'

// Test constants
export const testConstants = {
  DEFAULT_LAMPORTS: 1000000000n, // 1 SOL
  MIN_LAMPORTS: 1000000n, // 0.001 SOL
  TEST_TIMEOUT: 30000, // 30 seconds
  CONFIRMATION_TIMEOUT: 10000, // 10 seconds
  MOCK_BLOCKHASH: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  MOCK_SLOT: 150000000n,
  PROGRAM_ID: 'AJVoWJ4JC1xJR9ufGBGuMgFpHMLouB29sFRTJRvEK1ZR'
}

// Mock RPC factory for unit tests
export function createMockRpc() {
  return {
    getLatestBlockhash: vi.fn().mockResolvedValue({
      value: {
        blockhash: testConstants.MOCK_BLOCKHASH,
        lastValidBlockHeight: testConstants.MOCK_SLOT
      }
    }),
    getAccountInfo: vi.fn().mockResolvedValue({ value: null }),
    getMultipleAccounts: vi.fn().mockResolvedValue({ value: [] }),
    sendTransaction: vi.fn().mockResolvedValue('mockTransactionSignature'),
    simulateTransaction: vi.fn().mockResolvedValue({
      value: {
        err: null,
        logs: [],
        unitsConsumed: 5000n
      }
    }),
    getSignatureStatuses: vi.fn().mockResolvedValue({
      value: [{
        slot: testConstants.MOCK_SLOT,
        confirmations: 10,
        err: null,
        confirmationStatus: 'confirmed'
      }]
    }),
    getBalance: vi.fn().mockResolvedValue({
      value: lamports(testConstants.DEFAULT_LAMPORTS)
    }),
    getSlot: vi.fn().mockResolvedValue(testConstants.MOCK_SLOT),
    getHealth: vi.fn().mockResolvedValue('ok'),
    getRecentBlockhash: vi.fn().mockResolvedValue({
      value: {
        blockhash: testConstants.MOCK_BLOCKHASH,
        feeCalculator: { lamportsPerSignature: 5000 }
      }
    }),
    getMinimumBalanceForRentExemption: vi.fn().mockResolvedValue(890880),
    requestAirdrop: vi.fn().mockResolvedValue('airdropSignature'),
    confirmTransaction: vi.fn().mockResolvedValue({
      value: { err: null }
    })
  }
}

// Test data generators
export const testData = {
  agentName: (suffix: string = '') => `Test Agent ${suffix}`.trim(),
  agentDescription: () => 'AI agent for automated testing and validation',
  serviceTitle: (suffix: string = '') => `Test Service ${suffix}`.trim(),
  serviceDescription: () => 'Professional service for testing purposes',
  workOrderTitle: () => 'Test Work Order',
  avatarUrl: () => 'https://example.com/test-avatar.png',
  portfolioUrl: (index: number) => `https://github.com/test/project${index}`,
  deliveryUrl: () => 'https://example.com/test-delivery',
  category: () => 'Testing',
  capabilities: () => ['testing', 'validation', 'automation'],
  tags: () => ['test', 'automated', 'validation'],
  coverLetter: () => 'I am the perfect candidate for this test job...',
  requirements: () => ['Requirement 1', 'Requirement 2', 'Requirement 3'],
  deliverables: () => ['Deliverable 1', 'Deliverable 2'],
}

// Account generators
export async function createTestAccounts() {
  const payer = await generateKeyPairSigner()
  const agent = await generateKeyPairSigner()
  const buyer = await generateKeyPairSigner()
  const seller = await generateKeyPairSigner()
  const arbitrator = await generateKeyPairSigner()
  
  return { payer, agent, buyer, seller, arbitrator }
}

// Transaction helpers
export async function waitForConfirmation(ms: number = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function createMockTransaction() {
  return {
    recentBlockhash: testConstants.MOCK_BLOCKHASH,
    feePayer: null,
    instructions: [],
    signatures: []
  }
}

// Error matchers
export const errorMatchers = {
  insufficientFunds: /insufficient funds|insufficient lamports/i,
  invalidInstruction: /invalid instruction|instruction error/i,
  accountNotFound: /account not found|does not exist/i,
  unauthorized: /unauthorized|not authorized|invalid signer/i,
  networkError: /network error|connection refused|timeout/i,
  invalidEnum: /invalid enum variant/i,
  customError: (code: number) => new RegExp(`custom program error: 0x${code.toString(16)}`, 'i')
}

// Environment checkers
export const testEnvironment = {
  isCI: () => process.env.CI === 'true',
  isLocalValidator: () => process.env.USE_LOCAL_VALIDATOR === 'true',
  skipE2E: () => process.env.SKIP_E2E_TESTS === 'true',
  getNetwork: () => process.env.SOLANA_NETWORK || 'localnet',
  getProgramId: () => address(process.env.PROGRAM_ID || testConstants.PROGRAM_ID)
}

// Mock account data generators
export function createMockAccountData(type: 'agent' | 'listing' | 'payment' | 'workOrder') {
  const baseData = {
    executable: false,
    lamports: lamports(1000000n),
    owner: address(testConstants.PROGRAM_ID),
    rentEpoch: 300n
  }
  
  switch (type) {
    case 'agent':
      return {
        ...baseData,
        data: Buffer.from(JSON.stringify({
          name: 'Mock Agent',
          isActive: true,
          owner: 'mockOwnerAddress',
          reputation: { rating: 5, reviewCount: 10 }
        }))
      }
    case 'listing':
      return {
        ...baseData,
        data: Buffer.from(JSON.stringify({
          title: 'Mock Service',
          price: 1000000,
          seller: 'mockSellerAddress',
          isActive: true
        }))
      }
    case 'payment':
      return {
        ...baseData,
        data: Buffer.from(JSON.stringify({
          amount: 5000000,
          buyer: 'mockBuyerAddress',
          seller: 'mockSellerAddress',
          status: 'escrowed'
        }))
      }
    case 'workOrder':
      return {
        ...baseData,
        data: Buffer.from(JSON.stringify({
          title: 'Mock Work Order',
          buyer: 'mockBuyerAddress',
          seller: 'mockSellerAddress',
          status: 'pending'
        }))
      }
  }
}

// RPC response builders
export function buildSuccessResponse<T>(value: T) {
  return { value, context: { slot: testConstants.MOCK_SLOT } }
}

export function buildErrorResponse(error: string) {
  return { 
    value: null, 
    error: { 
      code: -32000, 
      message: error 
    } 
  }
}

// Instruction builders for testing
export function createMockInstruction(programId: Address = address(testConstants.PROGRAM_ID)) {
  return {
    programAddress: programId,
    accounts: [],
    data: Buffer.from([])
  }
}

// Test scenario helpers
export class TestScenario {
  private mockRpc: any
  private accounts: Record<string, TransactionSigner>
  
  constructor() {
    this.mockRpc = createMockRpc()
    this.accounts = {}
  }
  
  async setup() {
    const accounts = await createTestAccounts()
    this.accounts = accounts
    return { rpc: this.mockRpc, ...accounts }
  }
  
  mockAccountExists(address: Address, data?: any) {
    this.mockRpc.getAccountInfo.mockImplementation((addr: Address) => {
      if (addr === address) {
        return Promise.resolve({
          value: data || createMockAccountData('agent')
        })
      }
      return Promise.resolve({ value: null })
    })
  }
  
  mockTransaction(success: boolean = true, signature?: string) {
    if (success) {
      this.mockRpc.sendTransaction.mockResolvedValueOnce(
        signature || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      )
    } else {
      this.mockRpc.sendTransaction.mockRejectedValueOnce(
        new Error('Transaction failed')
      )
    }
  }
  
  mockBalance(address: Address, balance: bigint) {
    this.mockRpc.getBalance.mockImplementation((addr: Address) => {
      if (addr === address) {
        return Promise.resolve({ value: lamports(balance) })
      }
      return Promise.resolve({ value: lamports(0n) })
    })
  }
  
  getAccounts() {
    return this.accounts
  }
  
  getRpc() {
    return this.mockRpc
  }
}

// Assertion helpers
export const assertTransaction = {
  sent: (mockRpc: any, times: number = 1) => {
    expect(mockRpc.sendTransaction).toHaveBeenCalledTimes(times)
  },
  
  simulated: (mockRpc: any, times: number = 1) => {
    expect(mockRpc.simulateTransaction).toHaveBeenCalledTimes(times)
  },
  
  hasInstruction: (mockRpc: any, programId: Address) => {
    expect(mockRpc.sendTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        encoding: expect.any(String)
      })
    )
  },
  
  confirmed: (mockRpc: any, signature: string) => {
    expect(mockRpc.getSignatureStatuses).toHaveBeenCalledWith(
      expect.arrayContaining([signature])
    )
  }
}

// Performance measurement helpers
export class PerformanceTracker {
  private startTime: number
  private marks: Map<string, number>
  
  constructor() {
    this.startTime = Date.now()
    this.marks = new Map()
  }
  
  mark(name: string) {
    this.marks.set(name, Date.now())
  }
  
  measure(name: string, startMark?: string) {
    const endTime = Date.now()
    const startTime = startMark ? this.marks.get(startMark) || this.startTime : this.startTime
    return {
      name,
      duration: endTime - startTime,
      startTime,
      endTime
    }
  }
  
  getAllMeasurements() {
    const measurements = []
    let lastTime = this.startTime
    
    for (const [name, time] of this.marks) {
      measurements.push({
        name,
        duration: time - lastTime,
        timestamp: time
      })
      lastTime = time
    }
    
    return measurements
  }
}