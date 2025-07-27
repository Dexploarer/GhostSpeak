/**
 * CLI Agent Commands Unit Tests
 * 
 * Tests all agent-related CLI commands with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { address } from '@solana/addresses'
import type { Address } from '@solana/addresses'
import type { AgentWithAddress } from '@ghostspeak/sdk'

// Mock all external dependencies
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  text: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn()
  })),
  isCancel: vi.fn(),
  cancel: vi.fn(),
  log: { message: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))

vi.mock('../../src/utils/client.js', () => ({
  initializeClient: vi.fn(),
  getExplorerUrl: vi.fn(),
  handleTransactionError: vi.fn(),
  toSDKSigner: vi.fn()
}))

vi.mock('../../src/utils/agentWallet.js', () => ({
  AgentWalletManager: vi.fn(),
  AgentCNFTManager: vi.fn(),
  AgentBackupManager: vi.fn()
}))

vi.mock('../../src/prompts/agent.js', () => ({
  registerAgentPrompts: vi.fn()
}))

// Import after mocking
import { 
  intro, 
  outro, 
  text, 
  select, 
  multiselect, 
  confirm, 
  spinner,
  isCancel,
  cancel,
  log
} from '@clack/prompts'
import { initializeClient, getExplorerUrl, handleTransactionError, toSDKSigner } from '../../src/utils/client.js'
import { AgentWalletManager, AgentCNFTManager, AgentBackupManager } from '../../src/utils/agentWallet.js'
import { registerAgentPrompts } from '../../src/prompts/agent.js'

describe('CLI Agent Commands', () => {
  let mockClient: any
  let mockWalletManager: any
  let mockCNFTManager: any
  let mockBackupManager: any
  let mockSpinner: any
  let command: Command

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup mock client
    mockClient = {
      agent: {
        register: vi.fn(),
        list: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        verify: vi.fn(),
        getAnalytics: vi.fn()
      },
      rpc: {
        getBalance: vi.fn(),
        getAccountInfo: vi.fn()
      }
    }

    // Setup mock wallet manager
    mockWalletManager = {
      createAgent: vi.fn(),
      importAgent: vi.fn(),
      listAgents: vi.fn(),
      getAgent: vi.fn(),
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
      exportCredentials: vi.fn(),
      validateCredentials: vi.fn()
    }

    // Setup mock CNFT manager
    mockCNFTManager = {
      createCompressedAgent: vi.fn(),
      getCompressedAgentMetadata: vi.fn(),
      transferCompressedAgent: vi.fn()
    }

    // Setup mock backup manager
    mockBackupManager = {
      createBackup: vi.fn(),
      restoreBackup: vi.fn(),
      listBackups: vi.fn(),
      validateBackup: vi.fn()
    }

    // Setup mock spinner
    mockSpinner = {
      start: vi.fn(),
      stop: vi.fn(),
      message: vi.fn()
    }

    // Mock implementations
    vi.mocked(initializeClient).mockResolvedValue(mockClient)
    vi.mocked(AgentWalletManager).mockReturnValue(mockWalletManager)
    vi.mocked(AgentCNFTManager).mockReturnValue(mockCNFTManager)
    vi.mocked(AgentBackupManager).mockReturnValue(mockBackupManager)
    vi.mocked(spinner).mockReturnValue(mockSpinner)
    vi.mocked(getExplorerUrl).mockReturnValue('https://explorer.solana.com/tx/mock-signature')

    // Setup new command instance
    command = new Command()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Agent Registration', () => {
    it('should register a new agent with valid parameters', async () => {
      // Setup test data
      const agentData = {
        name: 'TestAgent',
        description: 'A test AI agent',
        capabilities: ['trading', 'analysis'],
        category: 'defi' as const,
        website: 'https://example.com',
        imageUrl: 'https://example.com/image.png'
      }

      const mockAgentAddress = address('11111111111111111111111111111112')
      const mockSignature = 'mock-transaction-signature'

      // Mock prompts
      vi.mocked(registerAgentPrompts).mockResolvedValue(agentData)
      vi.mocked(confirm).mockResolvedValue(true)
      vi.mocked(isCancel).mockReturnValue(false)

      // Mock client responses
      mockClient.agent.register.mockResolvedValue(mockSignature)
      mockWalletManager.createAgent.mockResolvedValue({
        address: mockAgentAddress,
        credentials: { publicKey: 'mock-key', privateKey: 'mock-private' }
      })

      // Import and test the register command
      const { registerAgent } = await import('../../src/commands/agent.js')
      await registerAgent({})

      // Verify prompts were called
      expect(intro).toHaveBeenCalledWith(expect.stringContaining('Agent Registration'))
      expect(registerAgentPrompts).toHaveBeenCalled()
      expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Register this agent?')
      }))

      // Verify client operations
      expect(initializeClient).toHaveBeenCalled()
      expect(mockClient.agent.register).toHaveBeenCalledWith(
        expect.any(Object), // signer
        expect.objectContaining({
          name: agentData.name,
          description: agentData.description,
          capabilities: agentData.capabilities,
          category: agentData.category
        })
      )

      // Verify wallet operations
      expect(mockWalletManager.createAgent).toHaveBeenCalled()

      // Verify success messages
      expect(outro).toHaveBeenCalledWith(expect.stringContaining('Agent registered successfully'))
    })

    it('should handle user cancellation during registration', async () => {
      // Mock user cancelling the registration
      vi.mocked(registerAgentPrompts).mockResolvedValue({
        name: 'TestAgent',
        description: 'Test',
        capabilities: ['test'],
        category: 'general' as const
      })
      vi.mocked(confirm).mockResolvedValue(false)

      const { registerAgent } = await import('../../src/commands/agent.js')
      await registerAgent({})

      // Verify cancellation was handled
      expect(cancel).toHaveBeenCalledWith('Registration cancelled.')
      expect(mockClient.agent.register).not.toHaveBeenCalled()
    })

    it('should handle registration errors gracefully', async () => {
      const agentData = {
        name: 'TestAgent',
        description: 'Test agent',
        capabilities: ['test'],
        category: 'general' as const
      }

      vi.mocked(registerAgentPrompts).mockResolvedValue(agentData)
      vi.mocked(confirm).mockResolvedValue(true)
      vi.mocked(isCancel).mockReturnValue(false)

      // Mock registration failure
      const mockError = new Error('Registration failed')
      mockClient.agent.register.mockRejectedValue(mockError)

      const { registerAgent } = await import('../../src/commands/agent.js')
      await registerAgent({})

      // Verify error handling
      expect(handleTransactionError).toHaveBeenCalledWith(mockError)
      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Failed to register agent'))
    })

    it('should validate required fields before registration', async () => {
      // Mock invalid agent data (missing name)
      vi.mocked(registerAgentPrompts).mockResolvedValue({
        name: '',
        description: 'Test',
        capabilities: ['test'],
        category: 'general' as const
      })

      const { registerAgent } = await import('../../src/commands/agent.js')
      await registerAgent({})

      // Verify validation prevented registration
      expect(cancel).toHaveBeenCalledWith(expect.stringContaining('Agent name is required'))
      expect(mockClient.agent.register).not.toHaveBeenCalled()
    })
  })

  describe('Agent Listing', () => {
    it('should list all agents with proper formatting', async () => {
      const mockAgents: AgentWithAddress[] = [
        {
          address: address('11111111111111111111111111111112'),
          data: {
            authority: address('11111111111111111111111111111113'),
            name: 'Agent1',
            description: 'First test agent',
            capabilities: ['trading'],
            category: 'defi',
            website: 'https://agent1.com',
            imageUrl: 'https://agent1.com/image.png',
            isActive: true,
            createdAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
            reputation: 850n,
            totalEarnings: 1000000n,
            jobsCompleted: 25n,
            successRate: 95n,
            lastActiveAt: BigInt(Date.now()),
            replicationTemplate: null,
            metadata: ''
          }
        },
        {
          address: address('11111111111111111111111111111114'),
          data: {
            authority: address('11111111111111111111111111111115'),
            name: 'Agent2',
            description: 'Second test agent',
            capabilities: ['analysis'],
            category: 'research',
            website: 'https://agent2.com',
            imageUrl: 'https://agent2.com/image.png',
            isActive: false,
            createdAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
            reputation: 750n,
            totalEarnings: 500000n,
            jobsCompleted: 10n,
            successRate: 80n,
            lastActiveAt: BigInt(Date.now() - 86400000),
            replicationTemplate: null,
            metadata: ''
          }
        }
      ]

      mockClient.agent.list.mockResolvedValue(mockAgents)

      const { listAgents } = await import('../../src/commands/agent.js')
      await listAgents({ all: false, category: undefined, active: undefined })

      // Verify client was called correctly
      expect(initializeClient).toHaveBeenCalled()
      expect(mockClient.agent.list).toHaveBeenCalled()

      // Verify output formatting
      expect(intro).toHaveBeenCalledWith(expect.stringContaining('Agent Registry'))
      expect(log.message).toHaveBeenCalledWith(expect.stringContaining('Agent1'))
      expect(log.message).toHaveBeenCalledWith(expect.stringContaining('Agent2'))
      expect(outro).toHaveBeenCalledWith(expect.stringContaining('2 agents found'))
    })

    it('should filter agents by category', async () => {
      const mockAgents: AgentWithAddress[] = [
        {
          address: address('11111111111111111111111111111112'),
          data: {
            authority: address('11111111111111111111111111111113'),
            name: 'DeFiAgent',
            description: 'DeFi specialist',
            capabilities: ['trading'],
            category: 'defi',
            website: '',
            imageUrl: '',
            isActive: true,
            createdAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
            reputation: 850n,
            totalEarnings: 1000000n,
            jobsCompleted: 25n,
            successRate: 95n,
            lastActiveAt: BigInt(Date.now()),
            replicationTemplate: null,
            metadata: ''
          }
        }
      ]

      mockClient.agent.list.mockResolvedValue(mockAgents)

      const { listAgents } = await import('../../src/commands/agent.js')
      await listAgents({ all: false, category: 'defi', active: undefined })

      // Verify filtering was applied
      expect(mockClient.agent.list).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'defi'
        })
      )
    })

    it('should handle empty agent list', async () => {
      mockClient.agent.list.mockResolvedValue([])

      const { listAgents } = await import('../../src/commands/agent.js')
      await listAgents({ all: false, category: undefined, active: undefined })

      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('No agents found'))
    })
  })

  describe('Agent Update', () => {
    it('should update agent with new information', async () => {
      const agentAddress = address('11111111111111111111111111111112')
      const updateData = {
        name: 'UpdatedAgent',
        description: 'Updated description',
        website: 'https://updated.com'
      }

      // Mock prompts for updates
      vi.mocked(select).mockResolvedValueOnce(agentAddress)
      vi.mocked(text).mockResolvedValueOnce(updateData.name)
      vi.mocked(text).mockResolvedValueOnce(updateData.description)
      vi.mocked(text).mockResolvedValueOnce(updateData.website)
      vi.mocked(confirm).mockResolvedValue(true)

      // Mock existing agent
      const mockAgent = {
        authority: address('11111111111111111111111111111113'),
        name: 'OriginalAgent',
        description: 'Original description',
        capabilities: ['trading'],
        category: 'defi',
        website: 'https://original.com',
        imageUrl: '',
        isActive: true,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
        reputation: 850n,
        totalEarnings: 1000000n,
        jobsCompleted: 25n,
        successRate: 95n,
        lastActiveAt: BigInt(Date.now()),
        replicationTemplate: null,
        metadata: ''
      }

      mockClient.agent.get.mockResolvedValue(mockAgent)
      mockClient.agent.update.mockResolvedValue('mock-update-signature')
      mockWalletManager.listAgents.mockResolvedValue([{
        address: agentAddress,
        credentials: { publicKey: 'mock-key', privateKey: 'mock-private' }
      }])

      const { updateAgent } = await import('../../src/commands/agent.js')
      await updateAgent({ agent: agentAddress.toString() })

      // Verify update operation
      expect(mockClient.agent.get).toHaveBeenCalledWith(agentAddress)
      expect(mockClient.agent.update).toHaveBeenCalledWith(
        expect.any(Object), // signer
        agentAddress,
        expect.objectContaining({
          name: updateData.name,
          description: updateData.description,
          website: updateData.website
        })
      )
    })

    it('should handle agent not found', async () => {
      const invalidAddress = address('11111111111111111111111111111112')
      
      mockClient.agent.get.mockResolvedValue(null)

      const { updateAgent } = await import('../../src/commands/agent.js')
      await updateAgent({ agent: invalidAddress.toString() })

      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Agent not found'))
    })
  })

  describe('Agent Verification', () => {
    it('should verify agent successfully', async () => {
      const agentAddress = address('11111111111111111111111111111112')
      
      // Mock verification prompts
      vi.mocked(text).mockResolvedValueOnce('verification-code-123')
      vi.mocked(confirm).mockResolvedValue(true)

      mockClient.agent.verify.mockResolvedValue('mock-verify-signature')

      const { verifyAgent } = await import('../../src/commands/agent.js')
      await verifyAgent({ 
        agent: agentAddress.toString(),
        code: undefined
      })

      expect(mockClient.agent.verify).toHaveBeenCalledWith(
        expect.any(Object), // signer
        agentAddress,
        'verification-code-123'
      )
      expect(outro).toHaveBeenCalledWith(expect.stringContaining('Agent verified successfully'))
    })

    it('should handle verification failure', async () => {
      const agentAddress = address('11111111111111111111111111111112')
      
      vi.mocked(text).mockResolvedValueOnce('invalid-code')
      vi.mocked(confirm).mockResolvedValue(true)

      const mockError = new Error('Invalid verification code')
      mockClient.agent.verify.mockRejectedValue(mockError)

      const { verifyAgent } = await import('../../src/commands/agent.js')
      await verifyAgent({ 
        agent: agentAddress.toString(),
        code: undefined
      })

      expect(handleTransactionError).toHaveBeenCalledWith(mockError)
    })
  })

  describe('Agent Analytics', () => {
    it('should display agent analytics with proper formatting', async () => {
      const agentAddress = address('11111111111111111111111111111112')
      const mockAnalytics = {
        totalEarnings: 1500000,
        jobsCompleted: 50,
        successRate: 96,
        averageRating: 4.8,
        totalTransactions: 75,
        uniqueClients: 25,
        totalVolume: 5000000n,
        activeAgents: 1,
        totalJobs: 50,
        totalAgents: 1,
        verifiedAgents: 1,
        jobsByCategory: { 'defi': 30, 'trading': 20 },
        earningsTrend: [
          { timestamp: BigInt(Date.now() - 86400000), earnings: 100000n },
          { timestamp: BigInt(Date.now()), earnings: 150000n }
        ],
        topClients: [
          { address: 'client1', jobCount: 10, totalSpent: 500000n }
        ],
        topCategories: [
          { name: 'defi', agentCount: 1 }
        ],
        topPerformers: [
          { name: 'TestAgent', address: agentAddress.toString(), successRate: 96, totalEarnings: 1500000n }
        ],
        growthMetrics: {
          weeklyGrowth: 15.5,
          monthlyGrowth: 42.3,
          totalGrowth: 156.8
        }
      }

      mockClient.agent.getAnalytics.mockResolvedValue(mockAnalytics)

      const { showAgentAnalytics } = await import('../../src/commands/agent.js')
      await showAgentAnalytics({
        agent: agentAddress.toString(),
        period: '30d',
        format: 'table'
      })

      // Verify analytics were fetched and displayed
      expect(mockClient.agent.getAnalytics).toHaveBeenCalledWith(
        agentAddress,
        expect.objectContaining({
          period: '30d'
        })
      )
      
      // Verify key metrics were displayed
      expect(log.message).toHaveBeenCalledWith(expect.stringContaining('Total Earnings'))
      expect(log.message).toHaveBeenCalledWith(expect.stringContaining('1,500,000'))
      expect(log.message).toHaveBeenCalledWith(expect.stringContaining('Jobs Completed'))
      expect(log.message).toHaveBeenCalledWith(expect.stringContaining('50'))
      expect(log.message).toHaveBeenCalledWith(expect.stringContaining('Success Rate'))
      expect(log.message).toHaveBeenCalledWith(expect.stringContaining('96%'))
    })

    it('should handle analytics request for non-existent agent', async () => {
      const invalidAddress = address('11111111111111111111111111111112')
      
      mockClient.agent.getAnalytics.mockResolvedValue(null)

      const { showAgentAnalytics } = await import('../../src/commands/agent.js')
      await showAgentAnalytics({
        agent: invalidAddress.toString(),
        period: '7d',
        format: 'json'
      })

      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('No analytics data found'))
    })
  })

  describe('Agent Wallet Management', () => {
    it('should import existing agent credentials', async () => {
      const agentAddress = address('11111111111111111111111111111112')
      const credentials = {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key'
      }

      vi.mocked(text).mockResolvedValueOnce(JSON.stringify(credentials))
      vi.mocked(confirm).mockResolvedValue(true)

      mockWalletManager.importAgent.mockResolvedValue(agentAddress)
      mockWalletManager.validateCredentials.mockResolvedValue(true)

      const { importAgent } = await import('../../src/commands/agent.js')
      await importAgent({})

      expect(mockWalletManager.validateCredentials).toHaveBeenCalledWith(credentials)
      expect(mockWalletManager.importAgent).toHaveBeenCalledWith(credentials)
      expect(outro).toHaveBeenCalledWith(expect.stringContaining('Agent imported successfully'))
    })

    it('should export agent credentials securely', async () => {
      const agentAddress = address('11111111111111111111111111111112')
      const credentials = {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key'
      }

      vi.mocked(select).mockResolvedValueOnce(agentAddress)
      vi.mocked(confirm).mockResolvedValueOnce(true) // Confirm export
      vi.mocked(confirm).mockResolvedValueOnce(false) // Don't save to file

      mockWalletManager.listAgents.mockResolvedValue([{
        address: agentAddress,
        credentials
      }])
      mockWalletManager.exportCredentials.mockResolvedValue(credentials)

      const { exportAgent } = await import('../../src/commands/agent.js')
      await exportAgent({})

      expect(mockWalletManager.exportCredentials).toHaveBeenCalledWith(agentAddress)
      expect(log.message).toHaveBeenCalledWith(expect.stringContaining('Agent credentials'))
    })
  })

  describe('Error Handling', () => {
    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network request failed')
      vi.mocked(initializeClient).mockRejectedValue(networkError)

      const { listAgents } = await import('../../src/commands/agent.js')
      await listAgents({ all: false, category: undefined, active: undefined })

      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Failed to connect'))
    })

    it('should handle insufficient balance for transactions', async () => {
      const agentData = {
        name: 'TestAgent',
        description: 'Test',
        capabilities: ['test'],
        category: 'general' as const
      }

      vi.mocked(registerAgentPrompts).mockResolvedValue(agentData)
      vi.mocked(confirm).mockResolvedValue(true)

      const balanceError = new Error('Insufficient funds')
      mockClient.agent.register.mockRejectedValue(balanceError)

      const { registerAgent } = await import('../../src/commands/agent.js')
      await registerAgent({})

      expect(handleTransactionError).toHaveBeenCalledWith(balanceError)
      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Insufficient funds'))
    })

    it('should handle malformed CLI arguments gracefully', async () => {
      const { updateAgent } = await import('../../src/commands/agent.js')
      
      // Test with invalid agent address
      await updateAgent({ agent: 'invalid-address' })

      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Invalid agent address'))
    })
  })
})