/**
 * AI Tool Generator for x402 Resources
 *
 * Converts x402 resources into AI-compatible tool definitions
 * for OpenAI, Anthropic, and LangChain integrations.
 *
 * @module x402/AIToolGenerator
 */

import type { JSONSchema7 } from './schemas/enhanced-x402.js'
import type { RegisteredResource } from './ResourceRegistry.js'
import type { Network } from './FacilitatorRegistry.js'

// =====================================================
// OPENAI TYPES
// =====================================================

/**
 * OpenAI function calling tool definition
 */
export interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: JSONSchema7
    strict?: boolean
  }
}

/**
 * OpenAI tool choice
 */
export type OpenAIToolChoice =
  | 'none'
  | 'auto'
  | 'required'
  | { type: 'function'; function: { name: string } }

// =====================================================
// ANTHROPIC TYPES
// =====================================================

/**
 * Anthropic tool definition
 */
export interface AnthropicTool {
  name: string
  description: string
  input_schema: JSONSchema7
}

// =====================================================
// LANGCHAIN TYPES
// =====================================================

/**
 * LangChain tool definition
 */
export interface LangChainTool {
  name: string
  description: string
  schema: JSONSchema7
  func?: (input: unknown) => Promise<unknown>
}

// =====================================================
// EXECUTABLE TOOL TYPES
// =====================================================

/**
 * Executable tool that can be called with payment
 */
export interface ExecutableTool {
  name: string
  description: string
  resource: RegisteredResource
  inputSchema: JSONSchema7
  outputSchema?: JSONSchema7
  execute: (input: unknown) => Promise<ExecuteToolResult>
}

/**
 * Tool execution result
 */
export interface ExecuteToolResult {
  success: boolean
  data?: unknown
  error?: string
  paymentSignature?: string
  paymentAmount?: bigint
  latencyMs: number
}

/**
 * Tool execution options
 */
export interface ExecuteToolOptions {
  maxPayment?: bigint
  timeout?: number
  retries?: number
}

// =====================================================
// AI TOOL GENERATOR CLASS
// =====================================================

/**
 * Generates AI-compatible tool definitions from x402 resources
 */
export class AIToolGenerator {
  private readonly defaultDescription =
    'An AI-powered API endpoint that accepts payment via the x402 protocol.'

  /**
   * Generate OpenAI function calling tool from x402 resource
   */
  generateOpenAITool(resource: RegisteredResource): OpenAITool {
    const name = this.sanitizeName(resource.name ?? this.extractName(resource.url))
    const description = this.buildDescription(resource, 'openai')
    const parameters = this.buildInputSchema(resource)

    return {
      type: 'function',
      function: {
        name,
        description,
        parameters,
        strict: false // Allow additional properties for flexibility
      }
    }
  }

  /**
   * Generate multiple OpenAI tools from resources
   */
  generateOpenAITools(resources: RegisteredResource[]): OpenAITool[] {
    return resources.map(r => this.generateOpenAITool(r))
  }

  /**
   * Generate Anthropic tool from x402 resource
   */
  generateAnthropicTool(resource: RegisteredResource): AnthropicTool {
    const name = this.sanitizeName(resource.name ?? this.extractName(resource.url))
    const description = this.buildDescription(resource, 'anthropic')
    const inputSchema = this.buildInputSchema(resource)

    return {
      name,
      description,
      input_schema: inputSchema
    }
  }

  /**
   * Generate multiple Anthropic tools from resources
   */
  generateAnthropicTools(resources: RegisteredResource[]): AnthropicTool[] {
    return resources.map(r => this.generateAnthropicTool(r))
  }

  /**
   * Generate LangChain tool from x402 resource
   */
  generateLangChainTool(resource: RegisteredResource): LangChainTool {
    const name = this.sanitizeName(resource.name ?? this.extractName(resource.url))
    const description = this.buildDescription(resource, 'langchain')
    const schema = this.buildInputSchema(resource)

    return {
      name,
      description,
      schema
    }
  }

  /**
   * Generate multiple LangChain tools from resources
   */
  generateLangChainTools(resources: RegisteredResource[]): LangChainTool[] {
    return resources.map(r => this.generateLangChainTool(r))
  }

  /**
   * Generate an MCP (Model Context Protocol) tool definition
   */
  generateMCPTool(resource: RegisteredResource): {
    name: string
    description: string
    inputSchema: JSONSchema7
  } {
    const name = this.sanitizeName(resource.name ?? this.extractName(resource.url))
    const description = this.buildDescription(resource, 'mcp')
    const inputSchema = this.buildInputSchema(resource)

    return {
      name,
      description,
      inputSchema
    }
  }

  // =====================================================
  // SCHEMA BUILDING
  // =====================================================

  /**
   * Build input schema for a resource
   */
  private buildInputSchema(resource: RegisteredResource): JSONSchema7 {
    // Use resource's input schema if available
    if (resource.inputSchema) {
      return resource.inputSchema
    }

    // Generate a generic schema based on common patterns
    return {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'The input to process'
        },
        options: {
          type: 'object',
          description: 'Optional parameters',
          additionalProperties: true
        }
      },
      required: ['input']
    }
  }

  /**
   * Build description for a tool
   */
  private buildDescription(
    resource: RegisteredResource,
    format: 'openai' | 'anthropic' | 'langchain' | 'mcp'
  ): string {
    const parts: string[] = []

    // Base description
    parts.push(resource.description ?? this.defaultDescription)

    // Add pricing info
    const pricing = this.formatPricing(resource)
    if (pricing) {
      parts.push(`Cost: ${pricing}`)
    }

    // Add category
    if (resource.category) {
      parts.push(`Category: ${resource.category}`)
    }

    // Add tags
    if (resource.tags.length > 0) {
      parts.push(`Tags: ${resource.tags.join(', ')}`)
    }

    // Format-specific additions
    if (format === 'openai') {
      parts.push('This tool requires x402 payment to execute.')
    }

    return parts.join('\n')
  }

  /**
   * Format pricing information
   */
  private formatPricing(resource: RegisteredResource): string | null {
    if (!resource.accepts.length) return null

    const accept = resource.accepts[0]
    const amount = BigInt(accept.maxAmountRequired)
    const network = accept.network

    // Format amount (assuming 6 decimals for USDC)
    const formatted = (Number(amount) / 1_000_000).toFixed(6)

    return `${formatted} USDC on ${network}`
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Sanitize name for use as function name
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 64) // Max length for function names
  }

  /**
   * Extract name from URL
   */
  private extractName(url: string): string {
    try {
      const parsed = new URL(url)
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      return pathParts[pathParts.length - 1] ?? parsed.hostname.replace(/\./g, '_')
    } catch {
      return 'x402_tool'
    }
  }

  /**
   * Generate TypeScript interface from JSON Schema
   */
  generateTypeScriptInterface(schema: JSONSchema7, name: string): string {
    const lines: string[] = []
    lines.push(`interface ${name} {`)

    if (schema.properties) {
      const required = new Set(schema.required ?? [])

      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const tsType = this.jsonSchemaToTypeScript(propSchema as JSONSchema7)
        const optional = required.has(propName) ? '' : '?'
        const description = (propSchema as JSONSchema7).description

        if (description) {
          lines.push(`  /** ${description} */`)
        }
        lines.push(`  ${propName}${optional}: ${tsType};`)
      }
    }

    lines.push('}')
    return lines.join('\n')
  }

  /**
   * Convert JSON Schema type to TypeScript type
   */
  private jsonSchemaToTypeScript(schema: JSONSchema7): string {
    if (!schema.type) {
      if (schema.enum) {
        return schema.enum.map(v => JSON.stringify(v)).join(' | ')
      }
      return 'unknown'
    }

    const type = Array.isArray(schema.type) ? schema.type[0] : schema.type

    switch (type) {
      case 'string':
        if (schema.enum) {
          return schema.enum.map(v => `'${v}'`).join(' | ')
        }
        return 'string'
      case 'number':
      case 'integer':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'null':
        return 'null'
      case 'array':
        if (schema.items) {
          const itemType = this.jsonSchemaToTypeScript(schema.items as JSONSchema7)
          return `${itemType}[]`
        }
        return 'unknown[]'
      case 'object':
        if (schema.properties) {
          const props = Object.entries(schema.properties)
            .map(([k, v]) => `${k}: ${this.jsonSchemaToTypeScript(v as JSONSchema7)}`)
            .join('; ')
          return `{ ${props} }`
        }
        if (schema.additionalProperties) {
          const valueType =
            typeof schema.additionalProperties === 'boolean'
              ? 'unknown'
              : this.jsonSchemaToTypeScript(schema.additionalProperties)
          return `Record<string, ${valueType}>`
        }
        return 'Record<string, unknown>'
      default:
        return 'unknown'
    }
  }

  /**
   * Generate integration code snippet for a resource
   */
  generateIntegrationSnippet(
    resource: RegisteredResource,
    platform: 'openai' | 'anthropic' | 'langchain'
  ): string {
    const name = this.sanitizeName(resource.name ?? this.extractName(resource.url))

    switch (platform) {
      case 'openai':
        return this.generateOpenAISnippet(resource, name)
      case 'anthropic':
        return this.generateAnthropicSnippet(resource, name)
      case 'langchain':
        return this.generateLangChainSnippet(resource, name)
      default:
        return ''
    }
  }

  /**
   * Generate OpenAI integration snippet
   */
  private generateOpenAISnippet(resource: RegisteredResource, name: string): string {
    const tool = this.generateOpenAITool(resource)

    return `// OpenAI Integration for ${name}
import OpenAI from 'openai';
import { fetchWithX402Payment } from '@ghostspeak/sdk/x402';

const client = new OpenAI();

const tools = [${JSON.stringify(tool, null, 2)}];

// Handle tool calls
async function handleToolCall(toolCall) {
  if (toolCall.function.name === '${name}') {
    const args = JSON.parse(toolCall.function.arguments);
    
    // Execute with x402 payment
    const response = await fetchWithX402Payment(
      '${resource.url}',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      },
      wallet // Your wallet signer
    );
    
    return await response.json();
  }
}

// Example usage
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Your prompt here' }],
  tools,
  tool_choice: 'auto'
});`
  }

  /**
   * Generate Anthropic integration snippet
   */
  private generateAnthropicSnippet(resource: RegisteredResource, name: string): string {
    const tool = this.generateAnthropicTool(resource)

    return `// Anthropic Integration for ${name}
import Anthropic from '@anthropic-ai/sdk';
import { fetchWithX402Payment } from '@ghostspeak/sdk/x402';

const client = new Anthropic();

const tools = [${JSON.stringify(tool, null, 2)}];

// Handle tool use
async function handleToolUse(toolUse) {
  if (toolUse.name === '${name}') {
    // Execute with x402 payment
    const response = await fetchWithX402Payment(
      '${resource.url}',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolUse.input)
      },
      wallet // Your wallet signer
    );
    
    return await response.json();
  }
}

// Example usage
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Your prompt here' }],
  tools
});`
  }

  /**
   * Generate LangChain integration snippet
   */
  private generateLangChainSnippet(resource: RegisteredResource, name: string): string {
    return `// LangChain Integration for ${name}
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { fetchWithX402Payment } from '@ghostspeak/sdk/x402';

const ${name}Tool = new DynamicStructuredTool({
  name: '${name}',
  description: '${resource.description ?? this.defaultDescription}',
  schema: z.object({
    input: z.string().describe('The input to process'),
    options: z.record(z.unknown()).optional()
  }),
  func: async (args) => {
    const response = await fetchWithX402Payment(
      '${resource.url}',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      },
      wallet // Your wallet signer
    );
    
    return await response.json();
  }
});

// Use with an agent
const tools = [${name}Tool];`
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create a new AI tool generator
 */
export function createAIToolGenerator(): AIToolGenerator {
  return new AIToolGenerator()
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Convert x402 resources to OpenAI tools
 */
export function resourcesToOpenAITools(resources: RegisteredResource[]): OpenAITool[] {
  const generator = new AIToolGenerator()
  return generator.generateOpenAITools(resources)
}

/**
 * Convert x402 resources to Anthropic tools
 */
export function resourcesToAnthropicTools(resources: RegisteredResource[]): AnthropicTool[] {
  const generator = new AIToolGenerator()
  return generator.generateAnthropicTools(resources)
}

/**
 * Convert x402 resources to LangChain tools
 */
export function resourcesToLangChainTools(resources: RegisteredResource[]): LangChainTool[] {
  const generator = new AIToolGenerator()
  return generator.generateLangChainTools(resources)
}
