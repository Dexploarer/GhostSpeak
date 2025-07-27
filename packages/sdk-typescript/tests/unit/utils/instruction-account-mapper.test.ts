import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  parseIdlInstructions,
  getInstructionMapping,
  generateAccountValidationError,
  validateInstructionAccounts,
  getAllInstructionNames,
  getCommonInstructions,
  exportInstructionMappings,
  type InstructionMapping,
  type AccountInfo,
  type InstructionAccountMap
} from '../../../src/utils/instruction-account-mapper'

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn()
}))

// Mock IDL data
const mockIdl = {
  instructions: [
    {
      name: 'register_agent',
      accounts: [
        { name: 'agent', writable: true, signer: false },
        { name: 'owner', writable: false, signer: true },
        { name: 'systemProgram', writable: false, signer: false, address: '11111111111111111111111111111111' }
      ],
      docs: ['Register a new agent in the system'],
      discriminator: [1, 2, 3, 4, 5, 6, 7, 8],
      args: [{ name: 'agentData', type: 'string' }]
    },
    {
      name: 'create_escrow',
      accounts: [
        { name: 'escrow', writable: true, signer: false, pda: { seeds: [] } },
        { name: 'payer', writable: true, signer: true },
        { name: 'recipient', writable: false, signer: false },
        { name: 'mint', writable: false, signer: false, optional: true }
      ],
      discriminator: [9, 10, 11, 12, 13, 14, 15, 16]
    },
    {
      name: '_export_test',
      accounts: [{ name: 'test', writable: false, signer: false }]
    }
  ]
}

describe('Instruction Account Mapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('parseIdlInstructions', () => {
    it('should parse IDL instructions successfully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIdl) as any)

      const result = parseIdlInstructions()

      expect(result).toBeDefined()
      expect(Object.keys(result)).toHaveLength(2) // Should skip _export_test
      expect(result.register_agent).toBeDefined()
      expect(result.create_escrow).toBeDefined()
      expect(result._export_test).toBeUndefined()
    })

    it('should throw error when IDL file not found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(() => parseIdlInstructions()).toThrow('IDL file not found')
    })

    it('should use custom IDL path when provided', () => {
      const customPath = '/custom/path/idl.json'
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIdl) as any)

      parseIdlInstructions(customPath)

      expect(fs.existsSync).toHaveBeenCalledWith(customPath)
      expect(fs.readFileSync).toHaveBeenCalledWith(customPath, 'utf8')
    })

    it('should handle empty IDL gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ }) as any)

      const result = parseIdlInstructions()

      expect(result).toEqual({})
    })

    it('should map account properties correctly', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIdl) as any)

      const result = parseIdlInstructions()
      const registerAgent = result.register_agent

      expect(registerAgent.expectedAccounts).toBe(3)
      expect(registerAgent.accounts).toHaveLength(3)
      
      expect(registerAgent.accounts[0]).toEqual({
        name: 'agent',
        writable: true,
        signer: false,
        optional: false,
        docs: [],
        address: undefined,
        pda: undefined
      })

      expect(registerAgent.accounts[2].address).toBe('11111111111111111111111111111111')
    })

    it('should preserve discriminator and args', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIdl) as any)

      const result = parseIdlInstructions()
      
      expect(result.register_agent.discriminator).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
      expect(result.register_agent.args).toEqual([{ name: 'agentData', type: 'string' }])
      expect(result.create_escrow.discriminator).toEqual([9, 10, 11, 12, 13, 14, 15, 16])
    })
  })

  describe('getInstructionMapping', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIdl) as any)
    })

    it('should return mapping for existing instruction', () => {
      const mapping = getInstructionMapping('register_agent')

      expect(mapping).toBeDefined()
      expect(mapping?.name).toBe('register_agent')
      expect(mapping?.expectedAccounts).toBe(3)
    })

    it('should return null for non-existent instruction', () => {
      const mapping = getInstructionMapping('non_existent')

      expect(mapping).toBeNull()
    })

    it('should return null for export instructions', () => {
      const mapping = getInstructionMapping('_export_test')

      expect(mapping).toBeNull()
    })
  })

  describe('generateAccountValidationError', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIdl) as any)
    })

    it('should generate error for incorrect account count', () => {
      const error = generateAccountValidationError('register_agent', 2)

      expect(error).toContain('Invalid account count for instruction "register_agent"')
      expect(error).toContain('Expected: 3 accounts')
      expect(error).toContain('Provided: 2 accounts')
      expect(error).toContain('agent (writable), owner (signer), systemProgram')
    })

    it('should include account names when provided', () => {
      const error = generateAccountValidationError('register_agent', 2, ['agent', 'owner'])

      expect(error).toContain('Provided accounts: [agent, owner]')
    })

    it('should include docs when available', () => {
      const error = generateAccountValidationError('register_agent', 2)

      expect(error).toContain('Description: Register a new agent in the system')
    })

    it('should return success message for correct account count', () => {
      const result = generateAccountValidationError('register_agent', 3)

      expect(result).toBe('Correct number of accounts provided for register_agent')
    })

    it('should handle unknown instruction', () => {
      const error = generateAccountValidationError('unknown_instruction', 1)

      expect(error).toBe('Unknown instruction: unknown_instruction')
    })

    it('should handle optional accounts in description', () => {
      const error = generateAccountValidationError('create_escrow', 2)

      expect(error).toContain('escrow (writable), payer (writable) (signer), recipient, mint')
    })
  })

  describe('validateInstructionAccounts', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIdl) as any)
    })

    it('should validate correct number of accounts', () => {
      const result = validateInstructionAccounts('register_agent', ['acc1', 'acc2', 'acc3'])

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should invalidate incorrect number of accounts', () => {
      const result = validateInstructionAccounts('register_agent', ['acc1', 'acc2'])

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid account count')
    })

    it('should handle unknown instruction', () => {
      const result = validateInstructionAccounts('unknown', [])

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Unknown instruction: unknown')
    })

    it('should work with empty account arrays', () => {
      const result = validateInstructionAccounts('register_agent', [])

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Expected: 3 accounts')
      expect(result.error).toContain('Provided: 0 accounts')
    })
  })

  describe('getAllInstructionNames', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIdl) as any)
    })

    it('should return all instruction names sorted', () => {
      const names = getAllInstructionNames()

      expect(names).toEqual(['create_escrow', 'register_agent'])
      expect(names).not.toContain('_export_test')
    })

    it('should return empty array for empty IDL', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}) as any)

      const names = getAllInstructionNames()

      expect(names).toEqual([])
    })
  })

  describe('getCommonInstructions', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIdl) as any)
    })

    it('should return only common instructions that exist', () => {
      const common = getCommonInstructions()

      expect(Object.keys(common)).toHaveLength(2)
      expect(common.register_agent).toBeDefined()
      expect(common.create_escrow).toBeDefined()
    })

    it('should handle when no common instructions exist', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ 
        instructions: [
          { name: 'rare_instruction', accounts: [] }
        ]
      }) as any)

      const common = getCommonInstructions()

      expect(Object.keys(common)).toHaveLength(0)
    })
  })

  describe('exportInstructionMappings', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockIdl) as any)
      vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    it('should export mappings to default path', () => {
      exportInstructionMappings()

      expect(fs.writeFileSync).toHaveBeenCalled()
      const [filePath, content] = vi.mocked(fs.writeFileSync).mock.calls[0]
      
      expect(filePath).toContain('instruction-mappings.json')
      expect(JSON.parse(content as string)).toHaveProperty('register_agent')
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Instruction mappings exported to:'))
    })

    it('should export mappings to custom path', () => {
      const customPath = '/custom/output.json'
      
      exportInstructionMappings(customPath)

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        customPath,
        expect.any(String)
      )
    })

    it('should format JSON output properly', () => {
      exportInstructionMappings()

      const [, content] = vi.mocked(fs.writeFileSync).mock.calls[0]
      const parsed = JSON.parse(content as string)
      
      expect(content).toContain('\n') // Should be pretty-printed
      expect(parsed.register_agent.expectedAccounts).toBe(3)
    })
  })

  describe('Edge cases', () => {
    it('should handle malformed JSON in IDL', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json')

      expect(() => parseIdlInstructions()).toThrow()
    })

    it('should handle instructions with no accounts', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ 
        instructions: [
          { name: 'no_accounts_instruction' }
        ]
      }) as any)

      const result = parseIdlInstructions()
      
      expect(result.no_accounts_instruction.expectedAccounts).toBe(0)
      expect(result.no_accounts_instruction.accounts).toEqual([])
    })

    it('should handle accounts with all optional properties', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ 
        instructions: [
          {
            name: 'test_instruction',
            accounts: [
              { 
                name: 'testAccount',
                writable: true,
                signer: true,
                optional: true,
                docs: ['Test account docs'],
                address: 'TestAddress123',
                pda: { seeds: ['test'] }
              }
            ]
          }
        ]
      }) as any)

      const result = parseIdlInstructions()
      const account = result.test_instruction.accounts[0]
      
      expect(account.writable).toBe(true)
      expect(account.signer).toBe(true)
      expect(account.optional).toBe(true)
      expect(account.docs).toEqual(['Test account docs'])
      expect(account.address).toBe('TestAddress123')
      expect(account.pda).toEqual({ seeds: ['test'] })
    })
  })
})