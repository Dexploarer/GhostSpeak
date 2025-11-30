/**
 * CLI Channel Command Tests
 * 
 * Tests for channel (A2A) CLI commands
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { channelCommand } from '../../src/commands/channel.js'
import * as prompts from '@clack/prompts'

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
vi.mock('../../src/utils/client.js', () => ({
    initializeClient: vi.fn(),
    getExplorerUrl: vi.fn(() => 'https://explorer.solana.com/tx/mock'),
    getAddressExplorerUrl: vi.fn(() => 'https://explorer.solana.com/address/mock'),
    handleTransactionError: vi.fn(),
    toSDKSigner: vi.fn((wallet) => wallet)
}))
vi.mock('../../src/utils/sdk-helpers.js', () => ({
    createSafeSDKClient: vi.fn()
}))
vi.mock('@solana/addresses', () => ({
    address: vi.fn((addr) => addr)
}))

import { initializeClient } from '../../src/utils/client.js'
import { createSafeSDKClient } from '../../src/utils/sdk-helpers.js'

describe('Channel CLI Commands', () => {
    describe('command structure', () => {
        it('should have channel command with alias a2a', () => {
            expect(channelCommand.name()).toBe('channel')
            expect(channelCommand.aliases()).toContain('a2a')
        })

        it('should have create, list, and send subcommands', () => {
            const commandNames = channelCommand.commands.map(cmd => cmd.name())
            expect(commandNames).toContain('create')
            expect(commandNames).toContain('list')
            expect(commandNames).toContain('send')
        })

        it('should have proper descriptions', () => {
            expect(channelCommand.description()).toContain('A2A')

            const createCmd = channelCommand.commands.find(cmd => cmd.name() === 'create')
            expect(createCmd?.description()).toBeTruthy()

            const listCmd = channelCommand.commands.find(cmd => cmd.name() === 'list')
            expect(listCmd?.description()).toBeTruthy()

            const sendCmd = channelCommand.commands.find(cmd => cmd.name() === 'send')
            expect(sendCmd?.description()).toBeTruthy()
        })
    })

    describe('create command', () => {
        it('should have create command with correct options', () => {
            const createCommand = channelCommand.commands.find(cmd => cmd.name() === 'create')
            expect(createCommand).toBeDefined()

            const options = createCommand?.options.map(opt => opt.long)
            expect(options).toContain('--name')
            expect(options).toContain('--visibility')
            expect(options).toContain('--description')
        })

        it('should accept name, visibility, and description options', async () => {
            const createCommand = channelCommand.commands.find(cmd => cmd.name() === 'create')
            expect(createCommand).toBeDefined()

            // Verify option parsing
            const parsed = createCommand?.parseOptions([
                '--name', 'Test Channel',
                '--visibility', 'public',
                '--description', 'Test description'
            ])

            expect(parsed?.operands).toBeDefined()
        })
    })

    describe('list command', () => {
        it('should have list command with correct options', () => {
            const listCommand = channelCommand.commands.find(cmd => cmd.name() === 'list')
            expect(listCommand).toBeDefined()

            const options = listCommand?.options.map(opt => opt.long)
            expect(options).toContain('--mine')
            expect(options).toContain('--public')
        })
    })

    describe('send command', () => {
        it('should have send command with correct options', () => {
            const sendCommand = channelCommand.commands.find(cmd => cmd.name() === 'send')
            expect(sendCommand).toBeDefined()

            const options = sendCommand?.options.map(opt => opt.long)
            expect(options).toContain('--channel')
            expect(options).toContain('--message')
        })
    })
})
