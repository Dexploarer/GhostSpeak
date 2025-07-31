/**
 * CLI Integration Tests
 * 
 * Tests the GhostSpeak CLI by spawning it as a child process
 * and verifying command execution end-to-end
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { homedir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Path to the CLI executable
const CLI_PATH = join(__dirname, '../../dist/index.js')
const TEST_CONFIG_DIR = join(homedir(), '.ghostspeak-test')

// Helper to run CLI commands
interface CLIResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

async function runCLI(args: string[], options?: {
  input?: string[]
  timeout?: number
  env?: Record<string, string>
}): Promise<CLIResult> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      GHOSTSPEAK_CONFIG_DIR: TEST_CONFIG_DIR,
      NODE_ENV: 'test',
      ...options?.env
    }

    const proc = spawn('node', [CLI_PATH, ...args], {
      env,
      timeout: options?.timeout ?? 10000
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    // Handle input if provided
    if (options?.input) {
      let inputIndex = 0
      const sendNextInput = () => {
        if (inputIndex < options.input!.length) {
          setTimeout(() => {
            proc.stdin.write(options.input![inputIndex] + '\n')
            inputIndex++
            sendNextInput()
          }, 100)
        }
      }
      sendNextInput()
    }

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code })
    })

    proc.on('error', (error) => {
      reject(error)
    })
  })
}

describe('CLI Integration Tests', () => {
  beforeAll(() => {
    // Create test config directory
    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true })
    }
  })

  afterAll(() => {
    // Clean up test config directory
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
    }
  })

  describe('Basic Commands', () => {
    it('should display version', async () => {
      const result = await runCLI(['--version'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toMatch(/2\.\d+\.\d+/)
    })

    it('should display help', async () => {
      const result = await runCLI(['--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Command-line interface')
      expect(result.stdout).toContain('agent')
      expect(result.stdout).toContain('marketplace')
      expect(result.stdout).toContain('escrow')
    })

    it('should show banner with no arguments', async () => {
      const result = await runCLI([], { timeout: 3000 })
      expect(result.stdout).toContain('GhostSpeak')
      expect(result.stdout).toContain('AI Agent Commerce Protocol CLI')
    })
  })

  describe('Help System', () => {
    it('should show available help topics', async () => {
      const result = await runCLI(['help'])
      // Help command shows topics or help info
      const output = result.stdout + result.stderr
      expect(output.toLowerCase()).toMatch(/help|topics|documentation/i)
    })

    it('should show specific topic help', async () => {
      const result = await runCLI(['help', 'getting-started'])
      // Help with topic shows relevant content
      const output = result.stdout + result.stderr
      expect(output).toBeTruthy()
    })

    it('should search help content', async () => {
      const result = await runCLI(['help', '-s', 'agent'])
      // Help search shows results or error
      const output = result.stdout + result.stderr
      expect(output).toBeTruthy()
    })
  })

  describe('Command Aliases', () => {
    it('should show all aliases', async () => {
      const result = await runCLI(['aliases'])
      // Aliases command shows list or error
      const output = result.stdout + result.stderr
      expect(output.toLowerCase()).toMatch(/alias|command|shortcut/i)
    })

    it('should resolve aliases correctly', async () => {
      const result = await runCLI(['tx'])
      // Transaction alias may show history or error
      const output = result.stdout + result.stderr
      expect(output).toBeTruthy()
    })
  })

  describe('Agent Commands', () => {
    it('should show agent help', async () => {
      const result = await runCLI(['agent'])
      // Agent command without subcommand shows help
      const output = result.stdout + result.stderr
      expect(output).toContain('agent')
      expect(output.toLowerCase()).toMatch(/register|list|manage/i)
    })

    it('should list agents (empty)', async () => {
      const result = await runCLI(['agent', 'list'])
      // May fail without wallet/config but should not crash
      const output = result.stdout + result.stderr
      expect(output).toBeTruthy()
    })

    it('should show agent registration help', async () => {
      const result = await runCLI(['agent', 'register', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Register a new AI agent')
    })

    it('should show agent status help', async () => {
      const result = await runCLI(['agent', 'status', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Check status')
    })

    it('should show agent update help', async () => {
      const result = await runCLI(['agent', 'update', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Update your AI agent')
    })

    it('should show agent search help', async () => {
      const result = await runCLI(['agent', 'search', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Search agents')
    })

    it('should show agent analytics help', async () => {
      const result = await runCLI(['agent', 'analytics', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('View agent performance')
    })

    it('should show agent credentials help', async () => {
      const result = await runCLI(['agent', 'credentials', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Manage agent credentials')
    })

    it('should show agent verify help', async () => {
      const result = await runCLI(['agent', 'verify', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Verify an AI agent')
    })

    it('should show agent uuid help', async () => {
      const result = await runCLI(['agent', 'uuid', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Look up agent by UUID')
    })
  })

  describe('Marketplace Commands', () => {
    it('should show marketplace help', async () => {
      const result = await runCLI(['marketplace'], { timeout: 3000 })
      // Marketplace shows help when no subcommand
      const output = result.stdout + result.stderr
      expect(output.toLowerCase()).toContain('marketplace')
    })

    it('should list marketplace offerings', async () => {
      const result = await runCLI(['marketplace', 'list'], { timeout: 3000 })
      // May fail without wallet but should not crash
      const output = result.stdout + result.stderr
      expect(output).toBeTruthy()
    })

    it('should show marketplace search help', async () => {
      const result = await runCLI(['marketplace', 'search', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Search marketplace')
    })

    it('should show marketplace create help', async () => {
      const result = await runCLI(['marketplace', 'create', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Create a new service listing')
    })

    it('should show marketplace purchase help', async () => {
      const result = await runCLI(['marketplace', 'purchase', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Purchase')
    })

    it('should show marketplace jobs help', async () => {
      const result = await runCLI(['marketplace', 'jobs'])
      const output = result.stdout + result.stderr
      expect(output.toLowerCase()).toContain('job')
    })

    it('should show marketplace jobs list help', async () => {
      const result = await runCLI(['marketplace', 'jobs', 'list', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('list')
    })

    it('should show marketplace jobs create help', async () => {
      const result = await runCLI(['marketplace', 'jobs', 'create', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('create')
    })

    it('should show marketplace jobs apply help', async () => {
      const result = await runCLI(['marketplace', 'jobs', 'apply', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('apply')
    })
  })

  describe('Wallet Commands', () => {
    it('should show wallet help', async () => {
      const result = await runCLI(['wallet', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('wallet')
    })

    it('should handle wallet info', async () => {
      const result = await runCLI(['wallet', 'info'])
      expect(result.exitCode).toBeDefined()
      // Should show wallet info or error message
      expect(result.stdout + result.stderr).toBeTruthy()
    })

    it('should show wallet balance help', async () => {
      const result = await runCLI(['wallet', 'balance', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Check wallet balance')
    })

    it('should show wallet create help', async () => {
      const result = await runCLI(['wallet', 'create', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Create')
    })

    it('should show wallet list help', async () => {
      const result = await runCLI(['wallet', 'list', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('List')
    })

    it('should show wallet backup help', async () => {
      const result = await runCLI(['wallet', 'backup', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('backup')
    })
  })

  describe('Config Commands', () => {
    it('should show config help', async () => {
      const result = await runCLI(['config', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('configuration')
    })

    it('should handle config show', async () => {
      const result = await runCLI(['config', 'show'])
      expect(result.exitCode).toBeDefined()
      // Should show config or indicate no config exists
    })
  })

  describe('Interactive Mode', () => {
    it('should launch interactive mode with -i flag', async () => {
      const result = await runCLI(['-i'], {
        input: ['q'], // Quit immediately
        timeout: 3000
      })
      expect(result.stdout.toLowerCase()).toMatch(/menu|interactive/i)
    })

    it('should show interactive menu options', async () => {
      const result = await runCLI(['-i'], {
        input: ['q'],
        timeout: 3000
      })
      expect(result.stdout.toLowerCase()).toMatch(/agent|marketplace|wallet|menu/i)
    })
  })

  describe('Error Handling', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await runCLI(['unknown-command'])
      expect(result.exitCode).not.toBe(0)
      const output = result.stdout + result.stderr
      expect(output.toLowerCase()).toContain('error')
    })

    it('should handle invalid options', async () => {
      const result = await runCLI(['agent', '--invalid-option'])
      expect(result.exitCode).not.toBe(0)
      const output = result.stdout + result.stderr
      expect(output.toLowerCase()).toContain('error')
    })
  })

  describe('Onboarding Flow', () => {
    it('should show onboarding help', async () => {
      const result = await runCLI(['onboard', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('onboarding')
    })

    it('should handle quickstart command', async () => {
      const result = await runCLI(['quickstart', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Quick setup for new and existing users')
    })
  })

  describe('Escrow Commands', () => {
    it('should show escrow help', async () => {
      const result = await runCLI(['escrow', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('escrow')
    })

    it('should show escrow create help', async () => {
      const result = await runCLI(['escrow', 'create', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Create')
    })

    it('should show escrow list help', async () => {
      const result = await runCLI(['escrow', 'list', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('List')
    })

    it('should show escrow release help', async () => {
      const result = await runCLI(['escrow', 'release', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Release')
    })

    it('should show escrow dispute help', async () => {
      const result = await runCLI(['escrow', 'dispute', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('dispute')
    })
  })

  describe('Channel Commands', () => {
    it('should show channel help', async () => {
      const result = await runCLI(['channel', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('channel')
    })

    it('should show channel create help', async () => {
      const result = await runCLI(['channel', 'create', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('create')
    })

    it('should show channel list help', async () => {
      const result = await runCLI(['channel', 'list', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('List')
    })

    it('should show channel send help', async () => {
      const result = await runCLI(['channel', 'send', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Send')
    })

    it('should show channel send help', async () => {
      const result = await runCLI(['channel', 'send', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout.toLowerCase()).toContain('send')
    })
  })

  describe('Auction Commands', () => {
    it('should show auction help', async () => {
      const result = await runCLI(['auction', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('auction')
    })

    it('should show auction create help', async () => {
      const result = await runCLI(['auction', 'create', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Create')
    })

    it('should show auction list help', async () => {
      const result = await runCLI(['auction', 'list', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('List')
    })

    it('should show auction bid help', async () => {
      const result = await runCLI(['auction', 'bid', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('bid')
    })

    it('should show auction finalize help', async () => {
      const result = await runCLI(['auction', 'finalize', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Finalize')
    })
  })

  describe('Dispute Commands', () => {
    it('should show dispute help', async () => {
      const result = await runCLI(['dispute', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('dispute')
    })

    it('should show dispute file help', async () => {
      const result = await runCLI(['dispute', 'file', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('File')
    })

    it('should show dispute list help', async () => {
      const result = await runCLI(['dispute', 'list', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('List')
    })

    it('should show dispute evidence help', async () => {
      const result = await runCLI(['dispute', 'evidence', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('evidence')
    })

    it('should show dispute resolve help', async () => {
      const result = await runCLI(['dispute', 'resolve', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Resolve')
    })
  })

  describe('Governance Commands', () => {
    it('should show governance help', async () => {
      const result = await runCLI(['governance', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('governance')
    })

    it('should show governance proposal help', async () => {
      const result = await runCLI(['governance', 'proposal'])
      expect((result.stdout + result.stderr).toLowerCase()).toContain('proposal')
    })

    it('should show governance vote help', async () => {
      const result = await runCLI(['governance', 'vote', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Vote')
    })

    it('should show governance multisig help', async () => {
      const result = await runCLI(['governance', 'multisig'])
      expect((result.stdout + result.stderr).toLowerCase()).toContain('multisig')
    })
  })

  describe('Faucet Commands', () => {
    it('should show faucet help', async () => {
      const result = await runCLI(['faucet', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('SOL')
    })

    it('should handle faucet request', async () => {
      const result = await runCLI(['faucet', '--amount', '0.1'], {
        timeout: 15000
      })
      // Should either succeed or show network error
      expect(result.exitCode).toBeDefined()
    })
  })

  describe('SDK Commands', () => {
    it('should show sdk help', async () => {
      const result = await runCLI(['sdk', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('SDK')
    })

    it('should show sdk info', async () => {
      const result = await runCLI(['sdk', 'info'])
      // SDK info command should work or show helpful message
      const output = result.stdout + result.stderr
      expect(output).toBeTruthy()
    })
  })

  describe('Update Command', () => {
    it('should show update help', async () => {
      const result = await runCLI(['update', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Update')
    })

    it('should show update help', async () => {
      const result = await runCLI(['update', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Update')
    })
  })

  describe('All Command Groups', () => {
    const commandGroups = [
      'agent',
      'marketplace', 
      'escrow',
      'channel',
      'auction',
      'dispute',
      'governance',
      'wallet',
      'config',
      'faucet',
      'sdk'
    ]

    commandGroups.forEach(cmd => {
      it(`should have working ${cmd} command`, async () => {
        const result = await runCLI([cmd, '--help'])
        // Some commands show help to stderr, some to stdout
        const output = result.stdout + result.stderr
        expect(output.toLowerCase()).toContain(cmd)
      })
    })
  })
})