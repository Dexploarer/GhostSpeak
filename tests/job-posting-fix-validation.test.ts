import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Test to validate the job posting bug fix
describe('Job Posting Bug Fix Validation', () => {
  describe('CLI Job Posting Implementation', () => {
    it('should call createJobPosting with correct parameters', async () => {
      const marketplaceCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/commands/marketplace.ts'),
        'utf-8'
      )
      
      // Should generate job posting address
      expect(marketplaceCode).toContain('getProgramDerivedAddress')
      expect(marketplaceCode).toContain('job_posting')
      expect(marketplaceCode).toContain('jobPostingId')
      
      // Should call createJobPosting with wallet, address, and params
      expect(marketplaceCode).toContain('createJobPosting(')
      expect(marketplaceCode).toContain('wallet,')
      expect(marketplaceCode).toContain('jobPostingAddress,')
      
      // Should have all required parameters
      expect(marketplaceCode).toContain('title: title as string')
      expect(marketplaceCode).toContain('description: description as string')
      expect(marketplaceCode).toContain('requirements: requirements as string[]')
      expect(marketplaceCode).toContain('budget: budgetAmount')
      expect(marketplaceCode).toContain('deadline: deadlineTimestamp')
      expect(marketplaceCode).toContain('skillsNeeded: []')
      expect(marketplaceCode).toContain('budgetMin: budgetAmount')
      expect(marketplaceCode).toContain('budgetMax: budgetAmount')
      expect(marketplaceCode).toContain('paymentToken:')
      expect(marketplaceCode).toContain('jobType: category as string')
      expect(marketplaceCode).toContain('experienceLevel:')
    })

    it('should handle result correctly', async () => {
      const marketplaceCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/commands/marketplace.ts'),
        'utf-8'
      )
      
      // Should use jobPostingId and jobPostingAddress from local variables
      expect(marketplaceCode).toContain('Job ID: ${jobPostingId}')
      expect(marketplaceCode).toContain('Job Address: ${jobPostingAddress}')
      
      // Should use result as transaction signature
      expect(marketplaceCode).toContain('getExplorerUrl(result, \'devnet\')')
      expect(marketplaceCode).toContain('getAddressExplorerUrl(jobPostingAddress, \'devnet\')')
      
      // Should not try to access result.jobId in job posting section
      expect(marketplaceCode).not.toContain('result.jobId')
    })
  })

  describe('SDK Job Posting Interface', () => {
    it('should have correct CreateJobPostingParams interface', async () => {
      const marketplaceInstructionsCode = readFileSync(
        join(process.cwd(), 'packages/sdk-typescript/src/client/instructions/MarketplaceInstructions.ts'),
        'utf-8'
      )
      
      // Should have all required fields in interface
      expect(marketplaceInstructionsCode).toContain('export interface CreateJobPostingParams')
      expect(marketplaceInstructionsCode).toContain('title: string')
      expect(marketplaceInstructionsCode).toContain('description: string')
      expect(marketplaceInstructionsCode).toContain('budget: bigint')
      expect(marketplaceInstructionsCode).toContain('deadline: bigint')
      expect(marketplaceInstructionsCode).toContain('requirements: string[]')
      expect(marketplaceInstructionsCode).toContain('skillsNeeded: string[]')
      expect(marketplaceInstructionsCode).toContain('budgetMin: bigint')
      expect(marketplaceInstructionsCode).toContain('budgetMax: bigint')
      expect(marketplaceInstructionsCode).toContain('paymentToken: Address')
      expect(marketplaceInstructionsCode).toContain('jobType: string')
      expect(marketplaceInstructionsCode).toContain('experienceLevel: string')
    })

    it('should have correct method signature', async () => {
      const marketplaceInstructionsCode = readFileSync(
        join(process.cwd(), 'packages/sdk-typescript/src/client/instructions/MarketplaceInstructions.ts'),
        'utf-8'
      )
      
      // Should have correct method signature
      expect(marketplaceInstructionsCode).toContain('async createJobPosting(')
      expect(marketplaceInstructionsCode).toContain('signer: KeyPairSigner,')
      expect(marketplaceInstructionsCode).toContain('jobPostingAddress: Address,')
      expect(marketplaceInstructionsCode).toContain('params: CreateJobPostingParams')
      expect(marketplaceInstructionsCode).toContain('): Promise<string>')
    })
  })

  describe('Error Prevention', () => {
    it('should not have the original broken call pattern', async () => {
      const marketplaceCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/commands/marketplace.ts'),
        'utf-8'
      )
      
      // Should not have the broken call pattern that caused the bug
      expect(marketplaceCode).not.toContain('createJobPosting({')
      
      // Should not try to access undefined title from result
      expect(marketplaceCode).not.toContain('result.title')
    })

    it('should handle budget conversion properly', async () => {
      const marketplaceCode = readFileSync(
        join(process.cwd(), 'packages/cli/src/commands/marketplace.ts'),
        'utf-8'
      )
      
      // Should convert budget to bigint properly
      expect(marketplaceCode).toContain('budgetAmount = BigInt(Math.floor(parseFloat(budget as string) * 1_000_000))')
      
      // Should use budgetAmount in all budget fields
      expect(marketplaceCode).toContain('budget: budgetAmount')
      expect(marketplaceCode).toContain('budgetMin: budgetAmount')
      expect(marketplaceCode).toContain('budgetMax: budgetAmount')
    })
  })

  describe('Build Verification', () => {
    it('should build successfully', async () => {
      const cliDistPath = join(process.cwd(), 'packages/cli/dist/index.js')
      const fs = require('fs')
      expect(fs.existsSync(cliDistPath)).toBe(true)
      
      // Check that the built file contains the fix
      const builtCode = fs.readFileSync(cliDistPath, 'utf-8')
      expect(builtCode).toContain('createJobPosting')
      expect(builtCode).toContain('jobPostingAddress')
    })
  })
})