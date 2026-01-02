import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { registerRegisterCommand } from '../../src/commands/agent/register'

describe('Agent Register Command', () => {
  let program: Command
  let agentCommand: Command

  beforeEach(() => {
    program = new Command()
    agentCommand = program.command('agent')
    registerRegisterCommand(agentCommand)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should register the register subcommand', () => {
    const registerCmd = agentCommand.commands.find(cmd => cmd.name() === 'register')
    expect(registerCmd).toBeDefined()
    expect(registerCmd?.description()).toContain('Register a new AI agent')
  })

  it('should have required options', () => {
    const registerCmd = agentCommand.commands.find(cmd => cmd.name() === 'register')
    const options = registerCmd?.options.map(opt => opt.long)

    expect(options).toContain('--name')
    expect(options).toContain('--description')
    expect(options).toContain('--capabilities')
    expect(options).toContain('--endpoint')
    expect(options).toContain('--yes')
  })

  it('should have short option for name', () => {
    const registerCmd = agentCommand.commands.find(cmd => cmd.name() === 'register')
    const nameOption = registerCmd?.options.find(opt => opt.long === '--name')
    
    expect(nameOption?.short).toBe('-n')
  })

  it('should have short option for description', () => {
    const registerCmd = agentCommand.commands.find(cmd => cmd.name() === 'register')
    const descOption = registerCmd?.options.find(opt => opt.long === '--description')
    
    expect(descOption?.short).toBe('-d')
  })
})
