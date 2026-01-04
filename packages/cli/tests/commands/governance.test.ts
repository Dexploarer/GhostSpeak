/**
 * CLI Governance Command Tests
 * 
 * Tests for governance, multisig, and proposals CLI commands
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { governanceCommand } from '../../src/commands/governance/index.js'

// Mock dependencies
vi.mock('@clack/prompts', () => ({
    intro: vi.fn(),
    outro: vi.fn(),
    text: vi.fn(),
    select: vi.fn(),
    confirm: vi.fn(),
    spinner: vi.fn(),
    isCancel: vi.fn(),
    cancel: vi.fn(),
    log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    note: vi.fn()
}))
vi.mock('../../src/utils/client.js', () => ({}))
vi.mock('../../src/utils/sdk-helpers.js', () => ({}))
vi.mock('@solana/addresses', () => ({
    address: vi.fn((addr) => addr)
}))

describe('Governance CLI Commands', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('command structure', () => {
        it('should have governance command', () => {
            expect(governanceCommand.name()).toBe('governance')
            expect(governanceCommand.description()).toContain('governance')
        })

        it('should have multisig subcommand', () => {
            const multisig = governanceCommand.commands.find(cmd => cmd.name() === 'multisig')
            expect(multisig).toBeDefined()
            expect(multisig?.commands.map(c => c.name())).toContain('create')
            expect(multisig?.commands.map(c => c.name())).toContain('list')
        })

        it('should have proposal subcommand', () => {
            const proposal = governanceCommand.commands.find(cmd => cmd.name() === 'proposal')
            expect(proposal).toBeDefined()
            expect(proposal?.commands.map(c => c.name())).toContain('create')
            expect(proposal?.commands.map(c => c.name())).toContain('list')
        })

        it('should have vote command', () => {
            const vote = governanceCommand.commands.find(cmd => cmd.name() === 'vote')
            expect(vote).toBeDefined()
        })

        it('should have rbac subcommand', () => {
            const rbac = governanceCommand.commands.find(cmd => cmd.name() === 'rbac')
            expect(rbac).toBeDefined()
            expect(rbac?.commands.map(c => c.name())).toContain('grant')
            expect(rbac?.commands.map(c => c.name())).toContain('revoke')
        })
    })

    describe('multisig create command', () => {
        it('should have correct options', () => {
            const multisig = governanceCommand.commands.find(cmd => cmd.name() === 'multisig')
            const createCmd = multisig?.commands.find(cmd => cmd.name() === 'create')

            expect(createCmd).toBeDefined()
            const options = createCmd?.options.map(opt => opt.long)
            expect(options).toContain('--name')
            expect(options).toContain('--members')
            expect(options).toContain('--threshold')
        })
    })

    describe('proposal create command', () => {
        it('should have correct options', () => {
            const proposal = governanceCommand.commands.find(cmd => cmd.name() === 'proposal')
            const createCmd = proposal?.commands.find(cmd => cmd.name() === 'create')

            expect(createCmd).toBeDefined()
            const options = createCmd?.options.map(opt => opt.long)
            expect(options).toContain('--title')
            expect(options).toContain('--description')
            expect(options).toContain('--type')
        })
    })

    describe('vote command', () => {
        it('should have correct options', () => {
            const voteCmd = governanceCommand.commands.find(cmd => cmd.name() === 'vote')

            expect(voteCmd).toBeDefined()
            const options = voteCmd?.options.map(opt => opt.long)
            expect(options).toContain('--proposal')
            expect(options).toContain('--choice')
        })
    })

    describe('rbac commands', () => {
        it('should have grant command with correct options', () => {
            const rbac = governanceCommand.commands.find(cmd => cmd.name() === 'rbac')
            const grantCmd = rbac?.commands.find(cmd => cmd.name() === 'grant')

            expect(grantCmd).toBeDefined()
            const options = grantCmd?.options.map(opt => opt.long)
            expect(options).toContain('--user')
            expect(options).toContain('--role')
        })

        it('should have revoke command with correct options', () => {
            const rbac = governanceCommand.commands.find(cmd => cmd.name() === 'rbac')
            const revokeCmd = rbac?.commands.find(cmd => cmd.name() === 'revoke')

            expect(revokeCmd).toBeDefined()
            const options = revokeCmd?.options.map(opt => opt.long)
            expect(options).toContain('--user')
            expect(options).toContain('--role')
        })
    })

    describe('proposal list command', () => {
        it('should have active filter option', () => {
            const proposal = governanceCommand.commands.find(cmd => cmd.name() === 'proposal')
            const listCmd = proposal?.commands.find(cmd => cmd.name() === 'list')

            expect(listCmd).toBeDefined()
            const options = listCmd?.options.map(opt => opt.long)
            expect(options).toContain('--active')
        })
    })
})
