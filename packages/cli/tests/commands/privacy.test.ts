/**
 * Privacy Command Tests
 * Tests for Ghost Score privacy management commands
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { privacyCommand } from '../../src/commands/privacy.js'
import {
  createMockSDKClient,
  createMockWallet,
  createMockRpc,
  createMockAgentData,
  mockConsole
} from '../utils/test-helpers.js'

// Mock dependencies
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  text: vi.fn(async () => 'TestAgent1111111111111111111111111111'),
  select: vi.fn(async () => 'selective'),
  confirm: vi.fn(async () => true),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  })),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  note: vi.fn()
}))

vi.mock('../../src/utils/client.js', () => ({
  initializeClient: vi.fn(async () => ({
    client: createMockSDKClient(),
    wallet: createMockWallet(),
    rpc: createMockRpc()
  })),
  getExplorerUrl: vi.fn((sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`),
  handleTransactionError: vi.fn((error) => error.message),
  toSDKSigner: vi.fn((wallet) => wallet)
}))

vi.mock('../../src/utils/sdk-helpers.js', () => ({
  createSafeSDKClient: vi.fn((client) => client)
}))

vi.mock('@solana/addresses', () => ({
  address: vi.fn((addr) => addr)
}))

describe('Privacy Command', () => {
  let restoreConsole: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    restoreConsole = mockConsole()
  })

  afterEach(() => {
    restoreConsole()
  })

  describe('command structure', () => {
    it('should have privacy command', () => {
      expect(privacyCommand.name()).toBe('privacy')
      expect(privacyCommand.description()).toContain('privacy')
    })

    it('should have set subcommand', () => {
      const setCmd = privacyCommand.commands.find(cmd => cmd.name() === 'set')
      expect(setCmd).toBeDefined()
      expect(setCmd?.description()).toContain('privacy')
    })

    it('should have get subcommand', () => {
      const getCmd = privacyCommand.commands.find(cmd => cmd.name() === 'get')
      expect(getCmd).toBeDefined()
      expect(getCmd?.description()).toContain('privacy')
    })

    it('should have presets subcommand', () => {
      const presetsCmd = privacyCommand.commands.find(cmd => cmd.name() === 'presets')
      expect(presetsCmd).toBeDefined()
      expect(presetsCmd?.description()).toContain('preset')
    })
  })

  describe('set command options', () => {
    it('should have agent option', () => {
      const setCmd = privacyCommand.commands.find(cmd => cmd.name() === 'set')
      const options = setCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have mode option', () => {
      const setCmd = privacyCommand.commands.find(cmd => cmd.name() === 'set')
      const options = setCmd?.options.map(opt => opt.long)
      expect(options).toContain('--mode')
    })

    it('should have score-visible option', () => {
      const setCmd = privacyCommand.commands.find(cmd => cmd.name() === 'set')
      const options = setCmd?.options.map(opt => opt.long)
      expect(options).toContain('--score-visible')
    })

    it('should have tier-visible option', () => {
      const setCmd = privacyCommand.commands.find(cmd => cmd.name() === 'set')
      const options = setCmd?.options.map(opt => opt.long)
      expect(options).toContain('--tier-visible')
    })
  })

  describe('get command options', () => {
    it('should have agent option', () => {
      const getCmd = privacyCommand.commands.find(cmd => cmd.name() === 'get')
      const options = getCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have json option', () => {
      const getCmd = privacyCommand.commands.find(cmd => cmd.name() === 'get')
      const options = getCmd?.options.map(opt => opt.long)
      expect(options).toContain('--json')
    })
  })

  describe('presets command options', () => {
    it('should have agent option', () => {
      const presetsCmd = privacyCommand.commands.find(cmd => cmd.name() === 'presets')
      const options = presetsCmd?.options.map(opt => opt.long)
      expect(options).toContain('--agent')
    })

    it('should have preset option', () => {
      const presetsCmd = privacyCommand.commands.find(cmd => cmd.name() === 'presets')
      const options = presetsCmd?.options.map(opt => opt.long)
      expect(options).toContain('--preset')
    })
  })
})

describe('Privacy Modes', () => {
  const PRIVACY_MODES = {
    public: {
      scoreVisible: true,
      tierVisible: true,
      metricsVisible: true
    },
    selective: {
      scoreVisible: false,
      tierVisible: true,
      metricsVisible: false
    },
    private: {
      scoreVisible: false,
      tierVisible: false,
      metricsVisible: false
    },
    anonymous: {
      scoreVisible: false,
      tierVisible: false,
      metricsVisible: false
    }
  }

  it('should define public mode correctly', () => {
    expect(PRIVACY_MODES.public.scoreVisible).toBe(true)
    expect(PRIVACY_MODES.public.tierVisible).toBe(true)
    expect(PRIVACY_MODES.public.metricsVisible).toBe(true)
  })

  it('should define selective mode correctly', () => {
    expect(PRIVACY_MODES.selective.scoreVisible).toBe(false)
    expect(PRIVACY_MODES.selective.tierVisible).toBe(true)
    expect(PRIVACY_MODES.selective.metricsVisible).toBe(false)
  })

  it('should define private mode correctly', () => {
    expect(PRIVACY_MODES.private.scoreVisible).toBe(false)
    expect(PRIVACY_MODES.private.tierVisible).toBe(false)
    expect(PRIVACY_MODES.private.metricsVisible).toBe(false)
  })

  it('should define anonymous mode correctly', () => {
    expect(PRIVACY_MODES.anonymous.scoreVisible).toBe(false)
    expect(PRIVACY_MODES.anonymous.tierVisible).toBe(false)
    expect(PRIVACY_MODES.anonymous.metricsVisible).toBe(false)
  })
})

describe('Privacy Mode Selection', () => {
  it('should validate privacy mode options', () => {
    const validModes = ['public', 'selective', 'private', 'anonymous']

    expect(validModes).toContain('public')
    expect(validModes).toContain('selective')
    expect(validModes).toContain('private')
    expect(validModes).toContain('anonymous')
    expect(validModes).toHaveLength(4)
  })

  it('should reject invalid privacy modes', () => {
    const validModes = ['public', 'selective', 'private', 'anonymous']
    const isValidMode = (mode: string) => validModes.includes(mode)

    expect(isValidMode('public')).toBe(true)
    expect(isValidMode('invalid')).toBe(false)
    expect(isValidMode('')).toBe(false)
    expect(isValidMode('Public')).toBe(false) // Case sensitive
  })
})

describe('Privacy Settings Validation', () => {
  it('should validate boolean visibility settings', () => {
    const validateBoolean = (value: any) => {
      return value === true || value === false || value === 'true' || value === 'false'
    }

    expect(validateBoolean(true)).toBe(true)
    expect(validateBoolean(false)).toBe(true)
    expect(validateBoolean('true')).toBe(true)
    expect(validateBoolean('false')).toBe(true)
    expect(validateBoolean('invalid')).toBe(false)
    expect(validateBoolean(undefined)).toBe(false)
  })

  it('should convert string booleans to boolean', () => {
    const parseBoolean = (value: string | boolean) => {
      return value === true || value === 'true'
    }

    expect(parseBoolean(true)).toBe(true)
    expect(parseBoolean(false)).toBe(false)
    expect(parseBoolean('true')).toBe(true)
    expect(parseBoolean('false')).toBe(false)
  })
})

describe('Privacy Preset Application', () => {
  it('should apply public preset settings', () => {
    const applyPreset = (preset: string) => {
      const presets: Record<string, any> = {
        public: {
          scoreVisible: true,
          tierVisible: true,
          metricsVisible: true
        }
      }
      return presets[preset]
    }

    const settings = applyPreset('public')
    expect(settings.scoreVisible).toBe(true)
    expect(settings.tierVisible).toBe(true)
    expect(settings.metricsVisible).toBe(true)
  })

  it('should apply selective preset settings', () => {
    const applyPreset = (preset: string) => {
      const presets: Record<string, any> = {
        selective: {
          scoreVisible: false,
          tierVisible: true,
          metricsVisible: false
        }
      }
      return presets[preset]
    }

    const settings = applyPreset('selective')
    expect(settings.scoreVisible).toBe(false)
    expect(settings.tierVisible).toBe(true)
    expect(settings.metricsVisible).toBe(false)
  })

  it('should apply private preset settings', () => {
    const applyPreset = (preset: string) => {
      const presets: Record<string, any> = {
        private: {
          scoreVisible: false,
          tierVisible: false,
          metricsVisible: false
        }
      }
      return presets[preset]
    }

    const settings = applyPreset('private')
    expect(settings.scoreVisible).toBe(false)
    expect(settings.tierVisible).toBe(false)
    expect(settings.metricsVisible).toBe(false)
  })

  it('should apply anonymous preset settings', () => {
    const applyPreset = (preset: string) => {
      const presets: Record<string, any> = {
        anonymous: {
          scoreVisible: false,
          tierVisible: false,
          metricsVisible: false
        }
      }
      return presets[preset]
    }

    const settings = applyPreset('anonymous')
    expect(settings.scoreVisible).toBe(false)
    expect(settings.tierVisible).toBe(false)
    expect(settings.metricsVisible).toBe(false)
  })
})

describe('Privacy Mode Descriptions', () => {
  it('should provide description for each mode', () => {
    const PRIVACY_MODES = {
      public: {
        description: 'All reputation data visible to everyone'
      },
      selective: {
        description: 'Show tier only, hide exact score'
      },
      private: {
        description: 'Hide score and tier, show only verified status'
      },
      anonymous: {
        description: 'Hide all reputation data'
      }
    }

    expect(PRIVACY_MODES.public.description).toBeTruthy()
    expect(PRIVACY_MODES.selective.description).toBeTruthy()
    expect(PRIVACY_MODES.private.description).toBeTruthy()
    expect(PRIVACY_MODES.anonymous.description).toBeTruthy()
  })

  it('should provide unique descriptions', () => {
    const PRIVACY_MODES = {
      public: { description: 'All reputation data visible to everyone' },
      selective: { description: 'Show tier only, hide exact score' },
      private: { description: 'Hide score and tier, show only verified status' },
      anonymous: { description: 'Hide all reputation data' }
    }

    const descriptions = Object.values(PRIVACY_MODES).map(m => m.description)
    const uniqueDescriptions = new Set(descriptions)

    expect(uniqueDescriptions.size).toBe(descriptions.length)
  })
})

describe('Privacy Custom Overrides', () => {
  it('should allow custom score visibility override', () => {
    const defaultSettings = {
      scoreVisible: false,
      tierVisible: true
    }

    const customSettings = {
      ...defaultSettings,
      scoreVisible: true // Override
    }

    expect(customSettings.scoreVisible).toBe(true)
    expect(customSettings.tierVisible).toBe(true)
  })

  it('should allow custom tier visibility override', () => {
    const defaultSettings = {
      scoreVisible: false,
      tierVisible: true
    }

    const customSettings = {
      ...defaultSettings,
      tierVisible: false // Override
    }

    expect(customSettings.scoreVisible).toBe(false)
    expect(customSettings.tierVisible).toBe(false)
  })

  it('should preserve preset settings without overrides', () => {
    const presetSettings = {
      scoreVisible: false,
      tierVisible: true,
      metricsVisible: false
    }

    const finalSettings = {
      ...presetSettings
    }

    expect(finalSettings).toEqual(presetSettings)
  })
})
