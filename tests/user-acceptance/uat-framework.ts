import { describe, it, expect, beforeAll } from 'vitest'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const exec = promisify(require('child_process').exec)

// User Acceptance Testing Framework
export class UATFramework {
  private cliPath: string
  private testResults: any[] = []

  constructor() {
    this.cliPath = 'npx ghostspeak'
  }

  // Simulate user interaction with CLI
  async runCliCommand(command: string, inputs?: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('npx', ['ghostspeak', ...command.split(' ')], {
        shell: true,
        env: { ...process.env, NODE_ENV: 'test' }
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      // Send inputs if provided
      if (inputs && inputs.length > 0) {
        let inputIndex = 0
        const sendInput = () => {
          if (inputIndex < inputs.length) {
            proc.stdin.write(inputs[inputIndex] + '\n')
            inputIndex++
            setTimeout(sendInput, 100)
          }
        }
        setTimeout(sendInput, 500)
      }

      proc.on('close', (code) => {
        if (code !== 0 && !stderr) {
          reject(new Error(`Command failed with code ${code}`))
        } else {
          resolve({ stdout, stderr })
        }
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        proc.kill()
        reject(new Error('Command timed out'))
      }, 30000)
    })
  }

  // Record test result
  recordResult(scenario: string, result: 'pass' | 'fail', details?: any) {
    this.testResults.push({
      scenario,
      result,
      details,
      timestamp: new Date().toISOString()
    })
  }

  // Generate UAT report
  generateReport(): string {
    const passCount = this.testResults.filter(r => r.result === 'pass').length
    const failCount = this.testResults.filter(r => r.result === 'fail').length
    const passRate = (passCount / this.testResults.length) * 100

    return `
# User Acceptance Testing Report

**Date**: ${new Date().toISOString()}
**Total Scenarios**: ${this.testResults.length}
**Passed**: ${passCount}
**Failed**: ${failCount}
**Pass Rate**: ${passRate.toFixed(2)}%

## Test Results

${this.testResults.map(r => `
### ${r.scenario}
- **Result**: ${r.result === 'pass' ? '✅ PASS' : '❌ FAIL'}
- **Time**: ${r.timestamp}
${r.details ? `- **Details**: ${JSON.stringify(r.details, null, 2)}` : ''}
`).join('\n')}
    `
  }
}

// User acceptance test scenarios
describe('User Acceptance Tests', () => {
  const uat = new UATFramework()

  describe('First-Time User Experience', () => {
    it('should guide new user through initial setup', async () => {
      try {
        // Test interactive menu
        const { stdout } = await uat.runCliCommand('', ['1', '1', 'exit'])
        
        expect(stdout).toContain('Welcome to GhostSpeak')
        expect(stdout).toContain('Creation')
        expect(stdout).toContain('Management')
        expect(stdout).toContain('Development')
        
        uat.recordResult('First-time setup', 'pass')
      } catch (error) {
        uat.recordResult('First-time setup', 'fail', error)
        throw error
      }
    })

    it('should show helpful error messages', async () => {
      try {
        const { stdout, stderr } = await uat.runCliCommand('agent register')
        
        // Should show missing parameters error
        const output = stdout + stderr
        expect(output).toMatch(/required|missing|usage/i)
        
        uat.recordResult('Error messaging', 'pass')
      } catch (error) {
        uat.recordResult('Error messaging', 'fail', error)
        throw error
      }
    })
  })

  describe('Agent Registration Flow', () => {
    it('should successfully register an agent with clear feedback', async () => {
      try {
        const inputs = [
          'Test Agent',           // Name
          'test@example.com',     // Email
          'https://test.com',     // Website
          'A test AI agent',      // Description
          'testing,ai',          // Tags
          ''                     // Metadata URI (use default)
        ]

        const { stdout } = await uat.runCliCommand('agent register', inputs)
        
        expect(stdout).toContain('Agent Registration')
        expect(stdout).toMatch(/success|registered|created/i)
        
        uat.recordResult('Agent registration', 'pass')
      } catch (error) {
        uat.recordResult('Agent registration', 'fail', error)
        throw error
      }
    })

    it('should show registered agents clearly', async () => {
      try {
        const { stdout } = await uat.runCliCommand('agent list')
        
        expect(stdout).toMatch(/agent.*list|your agents/i)
        expect(stdout).toContain('ID:')
        expect(stdout).toContain('Status:')
        
        uat.recordResult('Agent listing', 'pass')
      } catch (error) {
        uat.recordResult('Agent listing', 'fail', error)
        throw error
      }
    })
  })

  describe('Marketplace Interaction', () => {
    it('should browse marketplace intuitively', async () => {
      try {
        const { stdout } = await uat.runCliCommand('marketplace list')
        
        expect(stdout).toContain('Marketplace')
        // Should show listings or "no listings" message
        expect(stdout).toMatch(/listing|service|no.*found/i)
        
        uat.recordResult('Marketplace browsing', 'pass')
      } catch (error) {
        uat.recordResult('Marketplace browsing', 'fail', error)
        throw error
      }
    })

    it('should create listing with validation', async () => {
      try {
        const inputs = [
          'AI Code Review Service',  // Title
          'testing',                 // Category
          'Automated code review',   // Description
          '10',                     // Price (USDC)
          '24',                     // Delivery time (hours)
          '5'                       // Max orders
        ]

        const { stdout } = await uat.runCliCommand('marketplace create', inputs)
        
        expect(stdout).toMatch(/creating.*listing/i)
        expect(stdout).toMatch(/success|created/i)
        
        uat.recordResult('Listing creation', 'pass')
      } catch (error) {
        uat.recordResult('Listing creation', 'fail', error)
        throw error
      }
    })
  })

  describe('Developer Experience', () => {
    it('should install SDK easily', async () => {
      try {
        const { stdout } = await uat.runCliCommand('sdk install', ['npm'])
        
        expect(stdout).toContain('@ghostspeak/sdk')
        expect(stdout).toMatch(/install|add/i)
        
        uat.recordResult('SDK installation', 'pass')
      } catch (error) {
        uat.recordResult('SDK installation', 'fail', error)
        throw error
      }
    })

    it('should show SDK usage examples', async () => {
      try {
        const { stdout } = await uat.runCliCommand('sdk examples')
        
        expect(stdout).toContain('import')
        expect(stdout).toContain('GhostSpeakClient')
        expect(stdout).toMatch(/example|usage/i)
        
        uat.recordResult('SDK examples', 'pass')
      } catch (error) {
        uat.recordResult('SDK examples', 'fail', error)
        throw error
      }
    })
  })

  describe('Help and Documentation', () => {
    it('should provide contextual help', async () => {
      try {
        const { stdout } = await uat.runCliCommand('--help')
        
        expect(stdout).toContain('Commands:')
        expect(stdout).toContain('agent')
        expect(stdout).toContain('marketplace')
        expect(stdout).toContain('Options:')
        
        uat.recordResult('Help system', 'pass')
      } catch (error) {
        uat.recordResult('Help system', 'fail', error)
        throw error
      }
    })

    it('should show command-specific help', async () => {
      try {
        const { stdout } = await uat.runCliCommand('agent --help')
        
        expect(stdout).toContain('register')
        expect(stdout).toContain('list')
        expect(stdout).toContain('update')
        expect(stdout).toMatch(/usage|synopsis/i)
        
        uat.recordResult('Command help', 'pass')
      } catch (error) {
        uat.recordResult('Command help', 'fail', error)
        throw error
      }
    })
  })

  describe('Error Recovery', () => {
    it('should handle network errors gracefully', async () => {
      try {
        // Simulate network error by using invalid RPC
        process.env.GHOSTSPEAK_RPC_URL = 'https://invalid.rpc.url'
        
        const { stdout, stderr } = await uat.runCliCommand('agent list')
        const output = stdout + stderr
        
        expect(output).toMatch(/network|connection|failed|error/i)
        expect(output).not.toContain('undefined')
        expect(output).not.toContain('null')
        
        uat.recordResult('Network error handling', 'pass')
      } catch (error) {
        uat.recordResult('Network error handling', 'fail', error)
        throw error
      } finally {
        delete process.env.GHOSTSPEAK_RPC_URL
      }
    })

    it('should recover from invalid input', async () => {
      try {
        const inputs = [
          'invalid-price',  // Invalid price
          '10',            // Valid price
          '24',            // Delivery time
          '5'              // Max orders
        ]

        const { stdout } = await uat.runCliCommand('marketplace create', inputs)
        
        expect(stdout).toMatch(/invalid|error|try again/i)
        expect(stdout).toMatch(/success|created/i) // Should eventually succeed
        
        uat.recordResult('Input validation recovery', 'pass')
      } catch (error) {
        uat.recordResult('Input validation recovery', 'fail', error)
        throw error
      }
    })
  })

  describe('Performance Perception', () => {
    it('should show progress for long operations', async () => {
      try {
        const start = Date.now()
        const { stdout } = await uat.runCliCommand('agent register')
        const duration = Date.now() - start

        // Should show loading indicators
        expect(stdout).toMatch(/loading|processing|registering/i)
        
        // Should complete in reasonable time
        expect(duration).toBeLessThan(30000) // 30 seconds
        
        uat.recordResult('Operation feedback', 'pass', { duration })
      } catch (error) {
        uat.recordResult('Operation feedback', 'fail', error)
        throw error
      }
    })
  })

  // Generate and save UAT report
  afterAll(() => {
    const report = uat.generateReport()
    const reportPath = join(process.cwd(), 'uat-report.md')
    writeFileSync(reportPath, report)
    console.log(`\nUAT Report saved to: ${reportPath}`)
    
    // Print summary
    const results = uat['testResults']
    const passCount = results.filter(r => r.result === 'pass').length
    console.log(`\nUAT Summary: ${passCount}/${results.length} scenarios passed`)
  })
})

// Export test utilities for manual testing
export async function runManualTest() {
  const uat = new UATFramework()
  
  console.log('Starting manual UAT session...')
  console.log('Follow the prompts to test GhostSpeak CLI\n')

  // Add manual test scenarios here
  const scenarios = [
    {
      name: 'Register your first agent',
      command: 'agent register',
      expectedResult: 'Agent should be registered with wallet and credentials'
    },
    {
      name: 'List your agents',
      command: 'agent list',
      expectedResult: 'Should show your registered agents'
    },
    {
      name: 'Create a marketplace listing',
      command: 'marketplace create',
      expectedResult: 'Listing should be created and visible'
    }
  ]

  for (const scenario of scenarios) {
    console.log(`\n📋 Scenario: ${scenario.name}`)
    console.log(`Command: ghostspeak ${scenario.command}`)
    console.log(`Expected: ${scenario.expectedResult}`)
    
    const result = await prompt('\nDid this scenario pass? (y/n): ')
    const notes = await prompt('Any notes? (optional): ')
    
    uat.recordResult(scenario.name, result === 'y' ? 'pass' : 'fail', { notes })
  }

  const report = uat.generateReport()
  console.log('\n' + report)
}

// Helper function for manual testing
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })
    rl.question(question, (answer: string) => {
      rl.close()
      resolve(answer)
    })
  })
}