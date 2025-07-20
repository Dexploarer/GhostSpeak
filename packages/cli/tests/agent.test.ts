import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'
import { agentCommand } from '../src/commands/agent'

// Mock the SDK client
vi.mock('../src/utils/client', () => ({
  getClient: vi.fn(() => ({
    agent: {
      listAgents: vi.fn().mockResolvedValue([
        {
          id: address('Agent123'),
          name: 'Test Agent 1',
          owner: address('Owner123'),
          reputation: 100,
          isActive: true
        },
        {
          id: address('Agent456'),
          name: 'Test Agent 2', 
          owner: address('Owner456'),
          reputation: 85,
          isActive: true
        }
      ]),
      getAgent: vi.fn().mockResolvedValue({
        id: address('Agent123'),
        name: 'Test Agent 1',
        description: 'A test agent',
        avatar: 'https://example.com/avatar.png',
        owner: address('Owner123'),
        reputation: 100,
        totalEarned: 5000n,
        tasksCompleted: 10,
        isActive: true,
        capabilities: ['text-generation', 'data-analysis'],
        model: 'gpt-4'
      })
    }
  }))
}))

// Mock address function
const address = (str: string) => str as any

// Mock console methods
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('Agent Command', () => {
  let program: Command
  
  beforeEach(() => {
    vi.clearAllMocks()
    program = new Command()
    agentCommand(program)
  })
  
  it('should list agents', async () => {
    await program.parseAsync(['node', 'test', 'agent', 'list'])
    
    expect(mockLog).toHaveBeenCalled()
    const output = mockLog.mock.calls.map(call => call[0]).join('\n')
    expect(output).toContain('Test Agent 1')
    expect(output).toContain('Test Agent 2')
    expect(output).toContain('Active')
  })
  
  it('should show agent details', async () => {
    await program.parseAsync(['node', 'test', 'agent', 'get', 'Agent123'])
    
    expect(mockLog).toHaveBeenCalled()
    const output = mockLog.mock.calls.map(call => call[0]).join('\n')
    expect(output).toContain('Test Agent 1')
    expect(output).toContain('Owner123')
    expect(output).toContain('100')
    expect(output).toContain('text-generation')
    expect(output).toContain('data-analysis')
  })
  
  it('should handle errors gracefully', async () => {
    // Mock an error
    const { getClient } = await import('../src/utils/client')
    vi.mocked(getClient).mockImplementationOnce(() => {
      throw new Error('Connection failed')
    })
    
    await program.parseAsync(['node', 'test', 'agent', 'list'])
    
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('Error'),
      expect.any(Error)
    )
  })
})