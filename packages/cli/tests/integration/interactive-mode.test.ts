/**
 * Interactive Mode Integration Tests
 * 
 * Tests the GhostSpeak CLI interactive menu system
 * 
 * NOTE: These tests are skipped in CI because interactive mode requires a TTY
 * and proper stdin/stdout handling which is difficult in automated testing.
 * Run manually with: bun run test tests/integration/interactive-mode.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { homedir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const CLI_PATH = join(__dirname, '../../dist/index.js')
const TEST_CONFIG_DIR = join(homedir(), '.ghostspeak-test-interactive')

// Helper to interact with CLI in interactive mode
class InteractiveCLI {
  private proc: ChildProcess | null = null
  private stdout = ''
  private stderr = ''
  private outputCallbacks: ((data: string) => void)[] = []

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.proc = spawn('node', [CLI_PATH, '-i'], {
        env: {
          ...process.env,
          GHOSTSPEAK_CONFIG_DIR: TEST_CONFIG_DIR,
          NODE_ENV: 'test'
        }
      })

      this.proc.stdout?.on('data', (data) => {
        const output = data.toString()
        this.stdout += output
        this.outputCallbacks.forEach(cb => cb(output))
      })

      this.proc.stderr?.on('data', (data) => {
        this.stderr += data.toString()
      })

      this.proc.on('error', reject)

      // Wait for initial menu to appear
      const checkReady = setInterval(() => {
        if (this.stdout.includes('Main Menu')) {
          clearInterval(checkReady)
          resolve()
        }
      }, 100)

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkReady)
        reject(new Error('Interactive mode failed to start'))
      }, 5000)
    })
  }

  async sendInput(input: string): Promise<void> {
    if (!this.proc?.stdin) {
      throw new Error('CLI process not started')
    }

    return new Promise((resolve) => {
      this.proc!.stdin!.write(input + '\n')
      // Give time for processing
      setTimeout(resolve, 200)
    })
  }

  async waitForOutput(pattern: string | RegExp, timeout = 5000): Promise<boolean> {
    const startTime = Date.now()
    
    return new Promise((resolve) => {
      const check = () => {
        const match = typeof pattern === 'string' 
          ? this.stdout.includes(pattern)
          : pattern.test(this.stdout)
          
        if (match) {
          resolve(true)
        } else if (Date.now() - startTime > timeout) {
          resolve(false)
        } else {
          setTimeout(check, 100)
        }
      }
      
      check()
    })
  }

  getOutput(): string {
    return this.stdout
  }

  getErrors(): string {
    return this.stderr
  }

  async stop(): Promise<void> {
    if (this.proc) {
      this.proc.kill()
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  onOutput(callback: (data: string) => void): void {
    this.outputCallbacks.push(callback)
  }
}

describe.skip('Interactive Mode Tests', () => {
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

  describe('Main Menu Navigation', () => {
    it('should display main menu on startup', async () => {
      const cli = new InteractiveCLI()
      
      try {
        await cli.start()
        const output = cli.getOutput()
        
        expect(output).toContain('Main Menu')
        expect(output).toContain('Agent Management')
        expect(output).toContain('Marketplace')
        expect(output).toContain('Settings')
        expect(output).toContain('Help')
      } finally {
        await cli.stop()
      }
    })

    it('should navigate to agent management submenu', async () => {
      const cli = new InteractiveCLI()
      
      try {
        await cli.start()
        
        // Select Agent Management (typically option 1)
        await cli.sendInput('1')
        
        const hasSubmenu = await cli.waitForOutput('Agent Management')
        expect(hasSubmenu).toBe(true)
        
        const output = cli.getOutput()
        expect(output).toContain('Register New Agent')
        expect(output).toContain('List Agents')
      } finally {
        await cli.stop()
      }
    })

    it('should navigate back to main menu', async () => {
      const cli = new InteractiveCLI()
      
      try {
        await cli.start()
        
        // Go to Agent Management
        await cli.sendInput('1')
        await cli.waitForOutput('Agent Management')
        
        // Go back (typically 'b' or last option)
        await cli.sendInput('b')
        
        const backAtMain = await cli.waitForOutput(/Main Menu.*Agent Management/s)
        expect(backAtMain).toBe(true)
      } finally {
        await cli.stop()
      }
    })

    it('should quit from main menu', async () => {
      const cli = new InteractiveCLI()
      
      try {
        await cli.start()
        
        // Quit (typically 'q' or last option)
        await cli.sendInput('q')
        
        // Wait for process to exit
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const output = cli.getOutput()
        expect(output).toContain('Goodbye')
      } finally {
        await cli.stop()
      }
    })
  })

  describe('Quick Actions', () => {
    it('should show quick actions menu', async () => {
      const cli = new InteractiveCLI()
      
      try {
        await cli.start()
        
        // Navigate to Quick Actions (adjust based on actual menu position)
        await cli.sendInput('6') // Assuming Quick Actions is option 6
        
        const hasQuickActions = await cli.waitForOutput('Quick Actions')
        expect(hasQuickActions).toBe(true)
        
        const output = cli.getOutput()
        expect(output).toContain('Check Wallet Balance')
        expect(output).toContain('Request Devnet SOL')
      } finally {
        await cli.stop()
      }
    })
  })

  describe('Help System', () => {
    it('should show help menu', async () => {
      const cli = new InteractiveCLI()
      
      try {
        await cli.start()
        
        // Navigate to Help (adjust based on actual menu position)
        await cli.sendInput('7') // Assuming Help is option 7
        
        const hasHelp = await cli.waitForOutput('Help')
        expect(hasHelp).toBe(true)
        
        const output = cli.getOutput()
        expect(output).toContain('Documentation')
      } finally {
        await cli.stop()
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid menu selections', async () => {
      const cli = new InteractiveCLI()
      
      try {
        await cli.start()
        
        // Send invalid input
        await cli.sendInput('99')
        
        // Should still be at main menu
        await new Promise(resolve => setTimeout(resolve, 500))
        const output = cli.getOutput()
        expect(output).toContain('Main Menu')
      } finally {
        await cli.stop()
      }
    })

    it('should handle empty input', async () => {
      const cli = new InteractiveCLI()
      
      try {
        await cli.start()
        
        // Send empty input
        await cli.sendInput('')
        
        // Should still be at main menu
        await new Promise(resolve => setTimeout(resolve, 500))
        const output = cli.getOutput()
        expect(output).toContain('Main Menu')
      } finally {
        await cli.stop()
      }
    })
  })

  describe('Multi-level Navigation', () => {
    it('should navigate through multiple menu levels', async () => {
      const cli = new InteractiveCLI()
      
      try {
        await cli.start()
        
        // Navigate to Marketplace
        await cli.sendInput('2')
        await cli.waitForOutput('Marketplace')
        
        // Navigate to Search (if available)
        await cli.sendInput('1')
        
        // Should show search-related content or prompt
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const output = cli.getOutput()
        expect(output.toLowerCase()).toMatch(/search|marketplace/i)
      } finally {
        await cli.stop()
      }
    })
  })

  describe('Settings Navigation', () => {
    it('should access settings menu', async () => {
      const cli = new InteractiveCLI()
      
      try {
        await cli.start()
        
        // Navigate to Settings
        await cli.sendInput('5') // Assuming Settings is option 5
        
        const hasSettings = await cli.waitForOutput('Settings')
        expect(hasSettings).toBe(true)
        
        const output = cli.getOutput()
        expect(output.toLowerCase()).toMatch(/config|network|wallet/i)
      } finally {
        await cli.stop()
      }
    })
  })
})