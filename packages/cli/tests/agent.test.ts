import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'
import { agentCommand } from '../src/commands/agent/index.js'

// Mock console methods to prevent output during tests
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('Agent Command', () => {
  let program: Command
  
  beforeEach(() => {
    vi.clearAllMocks()
    program = new Command()
    // Add the agent command to the program
    program.addCommand(agentCommand)
  })
  
  it('should show agent help when called without subcommand', async () => {
    // The agent command is exported as a Command object
    expect(agentCommand).toBeInstanceOf(Command)
    expect(agentCommand.name()).toBe('agent')
    expect(agentCommand.alias()).toBe('a')
  })
  
  it('should have required subcommands', () => {
    const subcommands = agentCommand.commands.map(cmd => cmd.name())
    
    expect(subcommands).toContain('register')
    expect(subcommands).toContain('list')
    expect(subcommands).toContain('status')
    expect(subcommands).toContain('update')
    expect(subcommands).toContain('search')
    expect(subcommands).toContain('verify')
    expect(subcommands).toContain('analytics')
    expect(subcommands).toContain('credentials')
    expect(subcommands).toContain('uuid')
  })
  
  it('should have proper description', () => {
    expect(agentCommand.description()).toContain('Manage AI agents')
  })
})
