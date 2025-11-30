import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { container, ServiceTokens } from '../../src/core/Container'
import { LoggerService } from '../../src/core/logger'
import { IAgentService } from '../../src/types/services'
import { registerRegisterCommand } from '../../src/commands/agent/register'
import * as prompts from '@clack/prompts'
import * as agentPrompts from '../../src/prompts/agent.js'
import * as agentHelpers from '../../src/commands/agent/helpers.js'

// Mock dependencies
vi.mock('@clack/prompts')
vi.mock('../../src/prompts/agent.js')
vi.mock('../../src/commands/agent/helpers.js')

describe('Agent Register Command', () => {
  let program: Command
  let mockAgentService: IAgentService
  let mockLoggerService: LoggerService

  beforeEach(() => {
    program = new Command()
    const agentCommand = program.command('agent')
    registerRegisterCommand(agentCommand)

    mockAgentService = {
      register: vi.fn(),
    } as unknown as IAgentService

    mockLoggerService = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      handleError: vi.fn(),
    } as unknown as LoggerService

    container.register(ServiceTokens.AGENT_SERVICE, () => mockAgentService)
    container.register(ServiceTokens.LOGGER_SERVICE, () => mockLoggerService)

    // Mock the spinner
    (prompts.spinner).mockReturnValue({
        start: vi.fn(),
        stop: vi.fn(),
        message: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    container.clear()
  })

  it('should register an agent with valid data', async () => {
    const agentData = {
      name: 'Test Agent',
      description: 'A test agent for testing.',
      capabilities: ['test', 'debug'],
      serviceEndpoint: 'http://localhost:8080',
    }
    (prompts.isCancel).mockReturnValue(false)
    (agentPrompts.registerAgentPrompts).mockResolvedValue(agentData)
    (agentHelpers.validateAgentParams).mockReturnValue(null)

    const registeredAgent = { id: '123', ...agentData, address: 'someaddress', owner: 'someowner', isActive: true, reputationScore: 0, createdAt: 0n, updatedAt: 0n }
    (mockAgentService.register).mockResolvedValue(registeredAgent)

    await program.parseAsync(['node', 'test', 'agent', 'register'])

    expect(mockLoggerService.info).toHaveBeenCalledWith('Starting agent registration command')
    expect(mockAgentService.register).toHaveBeenCalledWith(expect.objectContaining({
      name: agentData.name,
    }))
    expect(mockLoggerService.info).toHaveBeenCalledWith('Agent registered successfully', { agentId: '123' })
    expect(agentHelpers.displayRegisteredAgentInfo).toHaveBeenCalledWith(registeredAgent)
  })

  it('should log an error if registration fails', async () => {
    const agentData = {
      name: 'Test Agent',
      description: 'A test agent for testing.',
      capabilities: ['test', 'debug'],
      serviceEndpoint: 'http://localhost:8080',
    }
    (prompts.isCancel).mockReturnValue(false)
    (agentPrompts.registerAgentPrompts).mockResolvedValue(agentData)
    (agentHelpers.validateAgentParams).mockReturnValue(null)

    const error = new Error('Registration failed')
    (mockAgentService.register).mockRejectedValue(error)

    await program.parseAsync(['node', 'test', 'agent', 'register'])

    expect(mockLoggerService.handleError).toHaveBeenCalledWith(error, 'Agent registration failed')
  })

  it('should warn if user cancels prompts', async () => {
    (prompts.isCancel).mockReturnValue(true)
    (agentPrompts.registerAgentPrompts).mockResolvedValue({} as any) // It will be cancelled, so we don't care about the value

    await program.parseAsync(['node', 'test', 'agent', 'register'])

    expect(mockLoggerService.warn).toHaveBeenCalledWith('Agent registration cancelled by user during prompts.')
    expect(mockAgentService.register).not.toHaveBeenCalled()
  })

  it('should handle validation failure', async () => {
    const agentData = {
      name: 't',
      description: 'short',
      capabilities: [],
    }
    const validationError = 'Agent name must be at least 3 characters long'
    (prompts.isCancel).mockReturnValue(false)
    (agentPrompts.registerAgentPrompts).mockResolvedValue(agentData)
    (agentHelpers.validateAgentParams).mockReturnValue(validationError)

    await program.parseAsync(['node', 'test', 'agent', 'register'])

    expect(mockLoggerService.error).toHaveBeenCalledWith('Agent parameter validation failed', new Error(validationError))
    expect(mockAgentService.register).not.toHaveBeenCalled()
  })
})
