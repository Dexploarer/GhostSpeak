/**
 * CLI Quickstart Command Tests
 * 
 * Tests for quickstart interactive setup wizard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quickstartCommand } from '../../src/commands/quickstart.js'

// Mock dependencies  
vi.mock('@clack/prompts', () => ({}))
vi.mock('../../src/utils/setup-helpers.js', () => ({}))
vi.mock('../../src/utils/config.js', () => ({}))
vi.mock('../../src/utils/client.js', () => ({}))
vi.mock('../../src/utils/sdk-helpers.js', () => ({}))
vi.mock('fs', () => ({}))
vi.mock('child_process', () => ({}))

describe('Quickstart CLI Command', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('command structure', () => {
        it('should have quickstart command', () => {
            expect(quickstartCommand.name()).toBe('quickstart')
            expect(quickstartCommand.description()).toContain('Quick setup')
        })

        it('should have new subcommand', () => {
            const newCmd = quickstartCommand.commands.find(cmd => cmd.name() === 'new')
            expect(newCmd).toBeDefined()
            expect(newCmd?.description()).toContain('new users')
        })

        it('should have existing subcommand', () => {
            const existingCmd = quickstartCommand.commands.find(cmd => cmd.name() === 'existing')
            expect(existingCmd).toBeDefined()
            expect(existingCmd?.description()).toContain('existing')
        })
    })

    describe('new user flow', () => {
        it('should have correct options', () => {
            const newCmd = quickstartCommand.commands.find(cmd => cmd.name() === 'new')
            const options = newCmd?.options.map(opt => opt.long)

            expect(options).toContain('--network')
            expect(options).toContain('--skip-agent')
            expect(options).toContain('--skip-multisig')
        })

        it('should default to devnet network', () => {
            const newCmd = quickstartCommand.commands.find(cmd => cmd.name() === 'new')
            const networkOption = newCmd?.options.find(opt => opt.long === '--network')

            expect(networkOption?.defaultValue).toBe('devnet')
        })
    })

    describe('existing wallet flow', () => {
        it('should have correct options', () => {
            const existingCmd = quickstartCommand.commands.find(cmd => cmd.name() === 'existing')
            const options = existingCmd?.options.map(opt => opt.long)

            expect(options).toContain('--network')
            expect(options).toContain('--wallet')
            expect(options).toContain('--skip-multisig')
        })

        it('should default to devnet network', () => {
            const existingCmd = quickstartCommand.commands.find(cmd => cmd.name() === 'existing')
            const networkOption = existingCmd?.options.find(opt => opt.long === '--network')

            expect(networkOption?.defaultValue).toBe('devnet')
        })
    })

    describe('command options', () => {
        it('should support network selection', () => {
            const newCmd = quickstartCommand.commands.find(cmd => cmd.name() === 'new')
            const networkOption = newCmd?.options.find(opt => opt.long === '--network')

            expect(networkOption).toBeDefined()
            expect(networkOption?.description).toContain('devnet')
            expect(networkOption?.description).toContain('testnet')
        })

        it('should support skip flags', () => {
            const newCmd = quickstartCommand.commands.find(cmd => cmd.name() === 'new')
            const options = newCmd?.options.map(opt => opt.long)

            expect(options).toContain('--skip-agent')
            expect(options).toContain('--skip-multisig')
        })
    })
})
