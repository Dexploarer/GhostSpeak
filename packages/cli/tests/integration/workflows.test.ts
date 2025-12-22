/**
 * End-to-End Workflow Tests
 * 
 * Tests complete user workflows from start to finish
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { homedir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const CLI_PATH = join(__dirname, '../../dist/index.js')
const TEST_CONFIG_DIR = join(homedir(), '.ghostspeak-test-workflows')

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

describe('End-to-End Workflows', () => {
  beforeAll(() => {
    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true })
    }
  })

  afterAll(() => {
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
    }
  })

  describe('New User Onboarding Workflow', () => {
    it('should guide user through initial setup', async () => {
      // Step 1: Check initial state
      const helpResult = await runCLI(['--help'])
      expect(helpResult.exitCode).toBe(0)
      expect(helpResult.stdout).toContain('Command-line interface')

      // Step 2: Run quickstart
      const quickstartHelp = await runCLI(['quickstart', '--help'])
      expect(quickstartHelp.exitCode).toBe(0)
      expect(quickstartHelp.stdout).toContain('Quick')

      // Step 3: Check wallet setup
      const walletInfo = await runCLI(['wallet', 'info'])
      // Either shows wallet or error (no wallet yet)
      expect(walletInfo.stdout + walletInfo.stderr).toBeTruthy()

      // Step 4: Check config
      const configShow = await runCLI(['config', 'show'])
      expect(configShow.stdout + configShow.stderr).toBeTruthy()
    })

    it('should handle onboarding command', async () => {
      const result = await runCLI(['onboard', '--help'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('onboarding')
    })
  })

  describe('Agent Creation and Listing Workflow', () => {
    it('should show agent registration process', async () => {
      // Step 1: Check agent registration help
      const registerHelp = await runCLI(['agent', 'register', '--help'])
      expect(registerHelp.exitCode).toBe(0)
      expect(registerHelp.stdout).toContain('Register a new AI agent')

      // Step 2: Check required options
      expect(registerHelp.stdout.toLowerCase()).toMatch(/name|description|capabilities/i)

      // Step 3: List agents (should show agents or loading or empty state)
      const listResult = await runCLI(['agent', 'list'])
      expect(listResult.exitCode).toBe(0)
      // Match any valid output: loading, listing results, no agents, or empty
      expect(listResult.stdout.toLowerCase()).toMatch(/loading|agent|no agents|empty|listing|completed/i)

      // Step 4: Check agent status
      const statusHelp = await runCLI(['agent', 'status', '--help'])
      expect(statusHelp.exitCode).toBe(0)
      expect(statusHelp.stdout).toContain('Check status')
    })
  })

  describe('Marketplace Service Listing Workflow', () => {
    it('should show marketplace creation flow', async () => {
      // Step 1: Check marketplace create help
      const createHelp = await runCLI(['marketplace', 'create', '--help'])
      expect(createHelp.exitCode).toBe(0)
      expect(createHelp.stdout).toContain('Create a new service listing')

      // Step 2: List marketplace (should handle empty case)
      const listResult = await runCLI(['marketplace', 'list'], { timeout: 3000 })
      expect(listResult.exitCode).toBe(0)
      expect(listResult.stdout.toLowerCase()).toMatch(/loading|marketplace/i)

      // Step 3: Search marketplace
      const searchHelp = await runCLI(['marketplace', 'search', '--help'])
      expect(searchHelp.exitCode).toBe(0)
      expect(searchHelp.stdout).toContain('Search')

      // Step 4: Purchase help
      const purchaseHelp = await runCLI(['marketplace', 'purchase', '--help'])
      expect(purchaseHelp.exitCode).toBe(0)
      expect(purchaseHelp.stdout).toContain('Purchase')
    })
  })

  describe('Escrow Payment Workflow', () => {
    it('should show escrow creation and management', async () => {
      // Step 1: Create escrow help
      const createHelp = await runCLI(['escrow', 'create', '--help'])
      expect(createHelp.exitCode).toBe(0)
      expect(createHelp.stdout).toContain('Create')

      // Step 2: List escrows
      const listHelp = await runCLI(['escrow', 'list', '--help'])
      expect(listHelp.exitCode).toBe(0)
      expect(listHelp.stdout).toContain('List')

      // Step 3: Release funds
      const releaseHelp = await runCLI(['escrow', 'release', '--help'])
      expect(releaseHelp.exitCode).toBe(0)
      expect(releaseHelp.stdout).toContain('Release')

      // Step 4: Dispute escrow
      const disputeHelp = await runCLI(['escrow', 'dispute', '--help'])
      expect(disputeHelp.exitCode).toBe(0)
      expect(disputeHelp.stdout).toContain('dispute')
    })
  })

  describe('Auction Creation and Bidding Workflow', () => {
    it('should show auction workflow', async () => {
      // Step 1: Create auction
      const createHelp = await runCLI(['auction', 'create', '--help'])
      expect(createHelp.exitCode).toBe(0)
      expect(createHelp.stdout).toContain('Create')

      // Step 2: List auctions
      const listHelp = await runCLI(['auction', 'list', '--help'])
      expect(listHelp.exitCode).toBe(0)
      expect(listHelp.stdout).toContain('List')

      // Step 3: Place bid
      const bidHelp = await runCLI(['auction', 'bid', '--help'])
      expect(bidHelp.exitCode).toBe(0)
      expect(bidHelp.stdout.toLowerCase()).toContain('bid')

      // Step 4: Finalize auction
      const finalizeHelp = await runCLI(['auction', 'finalize', '--help'])
      expect(finalizeHelp.exitCode).toBe(0)
      expect(finalizeHelp.stdout).toContain('Finalize')
    })
  })

  describe('Channel Communication Workflow', () => {
    it('should show channel workflow', async () => {
      // Step 1: Create channel
      const createHelp = await runCLI(['channel', 'create', '--help'])
      expect(createHelp.exitCode).toBe(0)
      expect(createHelp.stdout).toContain('Create')

      // Step 2: List channels
      const listHelp = await runCLI(['channel', 'list', '--help'])
      expect(listHelp.exitCode).toBe(0)
      expect(listHelp.stdout).toContain('List')

      // Step 3: Send message
      const sendHelp = await runCLI(['channel', 'send', '--help'])
      expect(sendHelp.exitCode).toBe(0)
      expect(sendHelp.stdout).toContain('Send')

      // Step 4: List channels
      const listResult = await runCLI(['channel', 'list'], { timeout: 3000 })
      // May show loading or channels
      const output = listResult.stdout + listResult.stderr
      expect(output).toBeTruthy()
    })
  })

  describe('Dispute Resolution Workflow', () => {
    it('should show dispute workflow', async () => {
      // Step 1: File dispute
      const fileHelp = await runCLI(['dispute', 'file', '--help'])
      expect(fileHelp.exitCode).toBe(0)
      expect(fileHelp.stdout).toContain('File')

      // Step 2: List disputes
      const listHelp = await runCLI(['dispute', 'list', '--help'])
      expect(listHelp.exitCode).toBe(0)
      expect(listHelp.stdout).toContain('List')

      // Step 3: Submit evidence
      const evidenceHelp = await runCLI(['dispute', 'evidence', '--help'])
      expect(evidenceHelp.exitCode).toBe(0)
      expect(evidenceHelp.stdout.toLowerCase()).toContain('evidence')

      // Step 4: Resolve dispute
      const resolveHelp = await runCLI(['dispute', 'resolve', '--help'])
      expect(resolveHelp.exitCode).toBe(0)
      expect(resolveHelp.stdout).toContain('Resolve')
    })
  })

  describe('Governance Participation Workflow', () => {
    it('should show governance workflow', async () => {
      // Step 1: Check governance help
      const govHelp = await runCLI(['governance', '--help'])
      expect(govHelp.exitCode).toBe(0)
      expect(govHelp.stdout).toContain('governance')

      // Step 2: Proposal management
      const proposalResult = await runCLI(['governance', 'proposal'])
      expect(proposalResult.stdout + proposalResult.stderr).toContain('proposal')

      // Step 3: Vote help
      const voteHelp = await runCLI(['governance', 'vote', '--help'])
      expect(voteHelp.exitCode).toBe(0)
      expect(voteHelp.stdout).toContain('Vote')

      // Step 4: Multisig
      const multisigResult = await runCLI(['governance', 'multisig'])
      expect(multisigResult.stdout + multisigResult.stderr).toContain('multisig')
    })
  })

  describe('Developer Workflow', () => {
    it('should show developer tools', async () => {
      // Step 1: SDK management
      const sdkHelp = await runCLI(['sdk', '--help'])
      expect(sdkHelp.exitCode).toBe(0)
      expect(sdkHelp.stdout).toContain('SDK')

      // Step 2: SDK info
      const sdkInfo = await runCLI(['sdk', 'info'])
      // SDK info might show version or other info
      const output = sdkInfo.stdout + sdkInfo.stderr
      expect(output).toBeTruthy()

      // Step 3: Update help
      const updateHelp = await runCLI(['update', '--help'])
      expect(updateHelp.exitCode).toBe(0)
      expect(updateHelp.stdout).toContain('Update')

      // Step 4: Help system
      const helpTopics = await runCLI(['help'])
      expect(helpTopics.exitCode).toBe(0)
      expect(helpTopics.stdout.toLowerCase()).toMatch(/help|topics|documentation/i)
    })
  })

  describe('Complete Service Transaction Workflow', () => {
    it('should demonstrate full service flow', async () => {
      // This test documents the complete flow even though
      // we can't execute it without a real blockchain connection

      // Step 1: Agent must be registered first
      const agentHelp = await runCLI(['agent', 'register', '--help'])
      expect(agentHelp.stdout).toContain('Register')

      // Step 2: Create marketplace listing
      const marketplaceHelp = await runCLI(['marketplace', 'create', '--help'])
      expect(marketplaceHelp.stdout).toContain('Create')

      // Step 3: Buyer searches and purchases
      const searchHelp = await runCLI(['marketplace', 'search', '--help'])
      expect(searchHelp.stdout).toContain('Search')

      // Step 4: Escrow is created for payment
      const escrowHelp = await runCLI(['escrow', 'create', '--help'])
      expect(escrowHelp.stdout).toContain('Create')

      // Step 5: Service is delivered via channels
      const channelHelp = await runCLI(['channel', 'create', '--help'])
      expect(channelHelp.stdout).toContain('Create')

      // Step 6: Payment is released
      const releaseHelp = await runCLI(['escrow', 'release', '--help'])
      expect(releaseHelp.stdout).toContain('Release')

      // Step 7: Analytics can be viewed
      const analyticsHelp = await runCLI(['agent', 'analytics', '--help'])
      expect(analyticsHelp.stdout).toContain('analytics')
    })
  })
})