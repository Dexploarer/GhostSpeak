/**
 * Comprehensive tests for Instruction Account Mapper
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
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
  type AccountInfo
} from '../../../src/utils/instruction-account-mapper.js'

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn()
}))

// Mock console for testing logs
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

// Sample IDL for testing
const sampleIdl = {
  instructions: [
    {
      name: 'register_agent',
      accounts: [
        { name: 'agent', writable: true },
        { name: 'owner', signer: true },
        { name: 'systemProgram', address: '11111111111111111111111111111111' }
      ],
      docs: ['Registers a new agent in the system'],
      discriminator: [1, 2, 3, 4, 5, 6, 7, 8],
      args: [{ name: 'name', type: 'string' }]
    },
    {
      name: 'create_escrow',
      accounts: [
        { name: 'escrow', writable: true },
        { name: 'client', signer: true, writable: true },
        { name: 'provider' },
        { name: 'tokenMint' },
        { name: 'systemProgram', address: '11111111111111111111111111111111' }
      ],
      docs: ['Creates a new escrow for agent services'],
      discriminator: [10, 20, 30, 40, 50, 60, 70, 80]
    },
    {
      name: 'send_message',
      accounts: [
        { name: 'channel', writable: true },
        { name: 'sender', signer: true },
        { name: 'clock', optional: true }
      ],
      discriminator: [100, 101, 102, 103, 104, 105, 106, 107]
    },
    {
      name: 'complex_instruction',
      accounts: [
        { 
          name: 'pdaAccount', 
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [1, 2, 3] },
              { kind: 'account', path: 'owner' }
            ]
          }
        },
        { name: 'owner', signer: true },
        { name: 'authority', signer: true, writable: true }
      ]
    },
    {
      name: '_export_instruction',
      accounts: [{ name: 'test' }]
    }
  ]
}

describe('Instruction Account Mapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('parseIdlInstructions', () => {
    it('should parse IDL and create instruction mappings', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))

      const mappings = parseIdlInstructions()

      expect(mappings).toBeDefined()
      expect(Object.keys(mappings)).toHaveLength(4) // Excludes _export_instruction
      
      // Check register_agent mapping
      const registerAgent = mappings['register_agent']
      expect(registerAgent).toBeDefined()
      expect(registerAgent.name).toBe('register_agent')
      expect(registerAgent.expectedAccounts).toBe(3)
      expect(registerAgent.accounts).toHaveLength(3)
      expect(registerAgent.docs).toEqual(['Registers a new agent in the system'])
      expect(registerAgent.discriminator).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
      expect(registerAgent.args).toEqual([{ name: 'name', type: 'string' }])

      // Check account details
      expect(registerAgent.accounts[0]).toEqual({
        name: 'agent',
        writable: true,
        signer: false,
        optional: false,
        docs: [],
        address: undefined,
        pda: undefined
      })
      expect(registerAgent.accounts[1]).toEqual({
        name: 'owner',
        writable: false,
        signer: true,
        optional: false,
        docs: [],
        address: undefined,
        pda: undefined
      })
      expect(registerAgent.accounts[2]).toEqual({
        name: 'systemProgram',
        writable: false,
        signer: false,
        optional: false,
        docs: [],
        address: '11111111111111111111111111111111',
        pda: undefined
      })
    })

    it('should handle custom IDL path', () => {
      const customPath = '/custom/path/idl.json'
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))

      const mappings = parseIdlInstructions(customPath)

      expect(fs.existsSync).toHaveBeenCalledWith(customPath)
      expect(fs.readFileSync).toHaveBeenCalledWith(customPath, 'utf8')
      expect(mappings).toBeDefined()
    })

    it('should throw error if IDL file not found', () => {
      (fs.existsSync as Mock).mockReturnValue(false)

      expect(() => parseIdlInstructions()).toThrow('IDL file not found')
    })

    it('should handle IDL without instructions', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify({}))

      const mappings = parseIdlInstructions()

      expect(mappings).toEqual({})
    })

    it('should skip export instructions', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))

      const mappings = parseIdlInstructions()

      expect(mappings['_export_instruction']).toBeUndefined()
    })

    it('should handle optional accounts', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))

      const mappings = parseIdlInstructions()
      const sendMessage = mappings['send_message']

      expect(sendMessage.accounts[2].optional).toBe(true)
    })

    it('should handle PDA accounts', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))

      const mappings = parseIdlInstructions()
      const complexInstruction = mappings['complex_instruction']

      expect(complexInstruction.accounts[0].pda).toBeDefined()
      expect(complexInstruction.accounts[0].pda?.seeds).toHaveLength(2)
    })
  })

  describe('getInstructionMapping', () => {
    beforeEach(() => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))
    })

    it('should return mapping for existing instruction', () => {
      const mapping = getInstructionMapping('register_agent')

      expect(mapping).toBeDefined()
      expect(mapping?.name).toBe('register_agent')
      expect(mapping?.expectedAccounts).toBe(3)
    })

    it('should return null for non-existing instruction', () => {
      const mapping = getInstructionMapping('non_existing_instruction')

      expect(mapping).toBeNull()
    })

    it('should return null for export instructions', () => {
      const mapping = getInstructionMapping('_export_instruction')

      expect(mapping).toBeNull()
    })
  })

  describe('generateAccountValidationError', () => {
    beforeEach(() => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))
    })

    it('should generate detailed error for too few accounts', () => {
      const error = generateAccountValidationError('create_escrow', 3)

      expect(error).toContain('Invalid account count for instruction "create_escrow"')
      expect(error).toContain('Expected: 5 accounts')
      expect(error).toContain('Provided: 3 accounts')
      expect(error).toContain('escrow (writable)')
      expect(error).toContain('client (writable) (signer)')
      expect(error).toContain('provider')
      expect(error).toContain('tokenMint')
      expect(error).toContain('systemProgram')
      expect(error).toContain('Creates a new escrow for agent services')
    })

    it('should generate error with provided account names', () => {
      const error = generateAccountValidationError(
        'register_agent', 
        2, 
        ['agent', 'owner']
      )

      expect(error).toContain('Provided accounts: [agent, owner]')
    })

    it('should return success message when correct account count', () => {
      const error = generateAccountValidationError('register_agent', 3)

      expect(error).toBe('Correct number of accounts provided for register_agent')
    })

    it('should handle unknown instruction', () => {
      const error = generateAccountValidationError('unknown_instruction', 5)

      expect(error).toBe('Unknown instruction: unknown_instruction')
    })

    it('should handle instructions without docs', () => {
      const error = generateAccountValidationError('send_message', 2)

      expect(error).toContain('Invalid account count')
      expect(error).not.toContain('Description:')
    })

    it('should format account requirements correctly', () => {
      const error = generateAccountValidationError('create_escrow', 2)

      expect(error).toContain('escrow (writable)')
      expect(error).toContain('client (writable) (signer)')
      expect(error).toContain('provider')
      expect(error).not.toContain('provider (writable)')
      expect(error).not.toContain('provider (signer)')
    })
  })

  describe('validateInstructionAccounts', () => {
    beforeEach(() => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))
    })

    it('should validate correct number of accounts', () => {
      const accounts = [{}, {}, {}]
      const result = validateInstructionAccounts('register_agent', accounts)

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should invalidate incorrect number of accounts', () => {
      const accounts = [{}, {}]
      const result = validateInstructionAccounts('register_agent', accounts)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid account count')
      expect(result.error).toContain('Expected: 3 accounts')
      expect(result.error).toContain('Provided: 2 accounts')
    })

    it('should handle unknown instruction', () => {
      const accounts = [{}, {}]
      const result = validateInstructionAccounts('unknown', accounts)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Unknown instruction: unknown')
    })

    it('should validate empty account array', () => {
      const result = validateInstructionAccounts('register_agent', [])

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Provided: 0 accounts')
    })
  })

  describe('getAllInstructionNames', () => {
    it('should return sorted list of instruction names', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))

      const names = getAllInstructionNames()

      expect(names).toEqual([
        'complex_instruction',
        'create_escrow',
        'register_agent',
        'send_message'
      ])
    })

    it('should handle empty IDL', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify({}))

      const names = getAllInstructionNames()

      expect(names).toEqual([])
    })
  })

  describe('getCommonInstructions', () => {
    it('should return only common instructions that exist', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))

      const common = getCommonInstructions()

      expect(Object.keys(common)).toContain('create_escrow')
      expect(Object.keys(common)).toContain('register_agent')
      expect(Object.keys(common)).toContain('send_message')
      expect(Object.keys(common)).not.toContain('complex_instruction')
      expect(Object.keys(common)).not.toContain('non_existing_instruction')
    })

    it('should return empty object if no common instructions exist', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        instructions: [
          { name: 'rare_instruction', accounts: [] }
        ]
      }))

      const common = getCommonInstructions()

      expect(common).toEqual({})
    })
  })

  describe('exportInstructionMappings', () => {
    beforeEach(() => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(sampleIdl))
    })

    it('should export mappings to default path', () => {
      exportInstructionMappings()

      expect(fs.writeFileSync).toHaveBeenCalled()
      const [filePath, content] = (fs.writeFileSync as Mock).mock.calls[0]
      
      expect(filePath).toContain('instruction-mappings.json')
      
      const parsed = JSON.parse(content)
      expect(parsed).toHaveProperty('register_agent')
      expect(parsed).toHaveProperty('create_escrow')
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Instruction mappings exported to:')
      )
    })

    it('should export to custom path', () => {
      const customPath = '/custom/output.json'
      exportInstructionMappings(customPath)

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        customPath,
        expect.any(String)
      )
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `Instruction mappings exported to: ${customPath}`
      )
    })

    it('should format JSON with proper indentation', () => {
      exportInstructionMappings()

      const [, content] = (fs.writeFileSync as Mock).mock.calls[0]
      
      // Check for proper formatting (2 space indentation)
      expect(content).toContain('\n  ')
      expect(content).toContain('{\n')
      expect(content).toContain('\n}')
    })
  })

  describe('Default export', () => {
    it('should export all functions as default', async () => {
      const defaultExport = await import('../../../src/utils/instruction-account-mapper.js')
      
      expect(defaultExport.default).toBeDefined()
      expect(defaultExport.default.parseIdlInstructions).toBe(parseIdlInstructions)
      expect(defaultExport.default.getInstructionMapping).toBe(getInstructionMapping)
      expect(defaultExport.default.generateAccountValidationError).toBe(generateAccountValidationError)
      expect(defaultExport.default.validateInstructionAccounts).toBe(validateInstructionAccounts)
      expect(defaultExport.default.getAllInstructionNames).toBe(getAllInstructionNames)
      expect(defaultExport.default.getCommonInstructions).toBe(getCommonInstructions)
      expect(defaultExport.default.exportInstructionMappings).toBe(exportInstructionMappings)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle malformed JSON in IDL', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue('{ invalid json')

      expect(() => parseIdlInstructions()).toThrow()
    })

    it('should handle instructions with no accounts', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        instructions: [
          { name: 'no_accounts_instruction' }
        ]
      }))

      const mappings = parseIdlInstructions()
      const instruction = mappings['no_accounts_instruction']

      expect(instruction.expectedAccounts).toBe(0)
      expect(instruction.accounts).toEqual([])
    })

    it('should handle accounts with all optional fields', () => {
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        instructions: [
          {
            name: 'full_account_instruction',
            accounts: [
              {
                name: 'fullAccount',
                writable: true,
                signer: true,
                optional: true,
                docs: ['This is a full account'],
                address: 'SomeAddress123',
                pda: { seeds: [{ kind: 'const', value: [1, 2, 3] }] }
              }
            ]
          }
        ]
      }))

      const mappings = parseIdlInstructions()
      const account = mappings['full_account_instruction'].accounts[0]

      expect(account.writable).toBe(true)
      expect(account.signer).toBe(true)
      expect(account.optional).toBe(true)
      expect(account.docs).toEqual(['This is a full account'])
      expect(account.address).toBe('SomeAddress123')
      expect(account.pda).toBeDefined()
    })

    it('should handle very long instruction names', () => {
      const longName = 'this_is_a_very_long_instruction_name_that_exceeds_normal_length'
      
      (fs.existsSync as Mock).mockReturnValue(true)
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
        instructions: [
          { name: longName, accounts: [] }
        ]
      }))

      const mappings = parseIdlInstructions()
      
      expect(mappings[longName]).toBeDefined()
      expect(mappings[longName].name).toBe(longName)
    })
  })
})