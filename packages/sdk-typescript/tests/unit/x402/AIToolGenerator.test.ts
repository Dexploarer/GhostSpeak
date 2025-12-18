/**
 * AIToolGenerator Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  AIToolGenerator,
  createAIToolGenerator,
  resourcesToOpenAITools,
  resourcesToAnthropicTools,
  resourcesToLangChainTools
} from '../../../src/x402/AIToolGenerator.js'
import type { RegisteredResource } from '../../../src/x402/ResourceRegistry.js'
import type { Address } from '@solana/kit'

// Mock resource for testing
const mockResource: RegisteredResource = {
  id: 'test-resource',
  url: 'https://api.test.com/v1/generate',
  type: 'http',
  x402Version: '1.0',
  accepts: [
    {
      scheme: 'exact',
      network: 'solana' as const,
      maxAmountRequired: '1000000',
      resource: 'https://api.test.com/v1/generate',
      payTo: 'GHOSTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    }
  ],
  maxAmount: 1000000n,
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'The input prompt' },
      maxTokens: { type: 'integer', description: 'Max tokens to generate' }
    },
    required: ['prompt']
  },
  outputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Generated text' },
      tokensUsed: { type: 'integer' }
    }
  },
  description: 'AI text generation API',
  name: 'Test Generator',
  tags: ['ai', 'text', 'generation'],
  category: 'text-generation',
  isActive: true,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('AIToolGenerator', () => {
  let generator: AIToolGenerator

  beforeEach(() => {
    generator = createAIToolGenerator()
  })

  describe('generateOpenAITool', () => {
    it('should generate a valid OpenAI tool', () => {
      const tool = generator.generateOpenAITool(mockResource)

      expect(tool.type).toBe('function')
      expect(tool.function.name).toBe('test_generator')
      expect(tool.function.description).toContain('AI text generation API')
      expect(tool.function.parameters).toBeDefined()
      expect(tool.function.parameters.type).toBe('object')
      expect(tool.function.parameters.properties).toBeDefined()
    })

    it('should include pricing information in description', () => {
      const tool = generator.generateOpenAITool(mockResource)
      expect(tool.function.description).toContain('USDC')
    })

    it('should sanitize tool name', () => {
      const resourceWithSpaces: RegisteredResource = {
        ...mockResource,
        name: 'My Tool With Spaces & Special!@#Chars'
      }
      const tool = generator.generateOpenAITool(resourceWithSpaces)
      expect(tool.function.name).not.toMatch(/[^a-z0-9_]/)
    })

    it('should use input schema from resource', () => {
      const tool = generator.generateOpenAITool(mockResource)
      expect(tool.function.parameters.properties?.prompt).toBeDefined()
      expect(tool.function.parameters.properties?.maxTokens).toBeDefined()
    })
  })

  describe('generateAnthropicTool', () => {
    it('should generate a valid Anthropic tool', () => {
      const tool = generator.generateAnthropicTool(mockResource)

      expect(tool.name).toBe('test_generator')
      expect(tool.description).toContain('AI text generation API')
      expect(tool.input_schema).toBeDefined()
      expect(tool.input_schema.type).toBe('object')
    })

    it('should have consistent name with OpenAI tool', () => {
      const openaiTool = generator.generateOpenAITool(mockResource)
      const anthropicTool = generator.generateAnthropicTool(mockResource)
      expect(openaiTool.function.name).toBe(anthropicTool.name)
    })
  })

  describe('generateLangChainTool', () => {
    it('should generate a valid LangChain tool', () => {
      const tool = generator.generateLangChainTool(mockResource)

      expect(tool.name).toBe('test_generator')
      expect(tool.description).toContain('AI text generation API')
      expect(tool.schema).toBeDefined()
    })
  })

  describe('generateMCPTool', () => {
    it('should generate a valid MCP tool', () => {
      const tool = generator.generateMCPTool(mockResource)

      expect(tool.name).toBe('test_generator')
      expect(tool.description).toBeDefined()
      expect(tool.inputSchema).toBeDefined()
    })
  })

  describe('batch generation', () => {
    it('should generate multiple OpenAI tools', () => {
      const tools = generator.generateOpenAITools([mockResource, mockResource])
      expect(tools.length).toBe(2)
    })

    it('should generate multiple Anthropic tools', () => {
      const tools = generator.generateAnthropicTools([mockResource, mockResource])
      expect(tools.length).toBe(2)
    })

    it('should generate multiple LangChain tools', () => {
      const tools = generator.generateLangChainTools([mockResource, mockResource])
      expect(tools.length).toBe(2)
    })
  })

  describe('TypeScript interface generation', () => {
    it('should generate TypeScript interface from schema', () => {
      const tsInterface = generator.generateTypeScriptInterface(
        mockResource.inputSchema!,
        'TestInput'
      )

      expect(tsInterface).toContain('interface TestInput')
      expect(tsInterface).toContain('prompt')
      expect(tsInterface).toContain('string')
    })
  })

  describe('integration snippets', () => {
    it('should generate OpenAI integration snippet', () => {
      const snippet = generator.generateIntegrationSnippet(mockResource, 'openai')

      expect(snippet).toContain('OpenAI')
      expect(snippet).toContain('fetchWithX402Payment')
      expect(snippet).toContain(mockResource.url)
    })

    it('should generate Anthropic integration snippet', () => {
      const snippet = generator.generateIntegrationSnippet(mockResource, 'anthropic')

      expect(snippet).toContain('Anthropic')
      expect(snippet).toContain('fetchWithX402Payment')
    })

    it('should generate LangChain integration snippet', () => {
      const snippet = generator.generateIntegrationSnippet(mockResource, 'langchain')

      expect(snippet).toContain('DynamicStructuredTool')
      expect(snippet).toContain('zod')
    })
  })
})

describe('Utility functions', () => {
  it('resourcesToOpenAITools should convert resources', () => {
    const tools = resourcesToOpenAITools([mockResource])
    expect(tools.length).toBe(1)
    expect(tools[0].type).toBe('function')
  })

  it('resourcesToAnthropicTools should convert resources', () => {
    const tools = resourcesToAnthropicTools([mockResource])
    expect(tools.length).toBe(1)
    expect(tools[0].name).toBeDefined()
  })

  it('resourcesToLangChainTools should convert resources', () => {
    const tools = resourcesToLangChainTools([mockResource])
    expect(tools.length).toBe(1)
    expect(tools[0].name).toBeDefined()
  })
})

describe('Edge cases', () => {
  let generator: AIToolGenerator

  beforeEach(() => {
    generator = createAIToolGenerator()
  })

  it('should handle resource without name', () => {
    const resourceNoName: RegisteredResource = {
      ...mockResource,
      name: undefined
    }
    const tool = generator.generateOpenAITool(resourceNoName)
    expect(tool.function.name).toBe('generate')
  })

  it('should handle resource without input schema', () => {
    const resourceNoSchema: RegisteredResource = {
      ...mockResource,
      inputSchema: undefined
    }
    const tool = generator.generateOpenAITool(resourceNoSchema)
    expect(tool.function.parameters).toBeDefined()
    expect(tool.function.parameters.properties?.input).toBeDefined()
  })

  it('should handle resource without description', () => {
    const resourceNoDesc: RegisteredResource = {
      ...mockResource,
      description: undefined
    }
    const tool = generator.generateOpenAITool(resourceNoDesc)
    expect(tool.function.description).toBeDefined()
  })

  it('should handle empty accepts array', () => {
    const resourceNoAccepts: RegisteredResource = {
      ...mockResource,
      accepts: []
    }
    const tool = generator.generateOpenAITool(resourceNoAccepts)
    expect(tool.function.description).not.toContain('USDC')
  })

  it('should truncate long names', () => {
    const longName = 'a'.repeat(100)
    const resourceLongName: RegisteredResource = {
      ...mockResource,
      name: longName
    }
    const tool = generator.generateOpenAITool(resourceLongName)
    expect(tool.function.name.length).toBeLessThanOrEqual(64)
  })
})
