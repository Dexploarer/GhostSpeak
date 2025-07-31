import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Configure hybrid test environment - real blockchain for integration tests, mocks for unit tests
// Use environment variable to control test mode: REAL_BLOCKCHAIN_TESTS=true for integration tests

// Set up test environment variables
process.env.NODE_ENV = 'test'
const useRealBlockchain = process.env.REAL_BLOCKCHAIN_TESTS === 'true'

if (useRealBlockchain) {
  process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'devnet'
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.devnet.solana.com'
  console.log('🔗 Integration test mode - using REAL blockchain connections to devnet')
} else {
  console.log('⚡ Unit test mode - using optimized mock implementations')
}

// Only mock browser-specific APIs that don't exist in test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage for browser compatibility
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage for browser compatibility
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Conditional mocking for unit tests (when not using real blockchain)
if (!useRealBlockchain) {
  // Mock the GhostSpeak client for fast unit tests
  vi.mock('@/lib/ghostspeak/client', () => ({
    getGhostSpeakClient: vi.fn(() => ({
      agents: () => ({
        module: {
          getAllAgents: vi.fn().mockResolvedValue([]),
          getAgentByAddress: vi.fn().mockResolvedValue({
            name: 'test-agent',
            reputationScore: 5000,
            totalJobsCompleted: 10,
          }),
        },
      }),
      marketplace: () => ({
        module: {
          getAllServiceListings: vi.fn().mockResolvedValue([]),
          getAllJobPostings: vi.fn().mockResolvedValue([]),
        },
      }),
      escrow: () => ({
        module: {
          getAllEscrows: vi.fn().mockResolvedValue([]),
        },
      }),
      rpc: {
        getAccountInfo: vi.fn().mockResolvedValue({ data: new Uint8Array() }),
        getSlot: vi.fn().mockResolvedValue(100000),
        getGenesisHash: vi.fn().mockResolvedValue('devnet-genesis-hash'),
      },
    })),
  }))
}

console.log('🧪 Test setup complete')
if (useRealBlockchain) {
  console.log('📡 RPC URL:', process.env.NEXT_PUBLIC_SOLANA_RPC_URL)
  console.log('🌐 Network:', process.env.NEXT_PUBLIC_SOLANA_NETWORK)
}
