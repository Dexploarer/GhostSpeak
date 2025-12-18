/**
 * Enhanced x402 Response Schema
 *
 * Extended x402 protocol schema with AI integration fields.
 * Enables AI models to understand and use x402 resources as tools.
 *
 * @module x402/schemas/enhanced-x402
 */

import type { Network } from '../FacilitatorRegistry.js'

// =====================================================
// JSON SCHEMA TYPES
// =====================================================

/**
 * JSON Schema 7 compatible schema definition
 */
export interface JSONSchema7 {
  // Core
  $schema?: string
  $id?: string
  $ref?: string
  $defs?: Record<string, JSONSchema7>

  // Meta
  title?: string
  description?: string
  default?: unknown
  examples?: unknown[]
  deprecated?: boolean
  readOnly?: boolean
  writeOnly?: boolean

  // Type
  type?: JSONSchema7Type | JSONSchema7Type[]
  enum?: unknown[]
  const?: unknown

  // String
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string

  // Number
  multipleOf?: number
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number

  // Array
  items?: JSONSchema7 | JSONSchema7[]
  additionalItems?: JSONSchema7 | boolean
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  contains?: JSONSchema7

  // Object
  properties?: Record<string, JSONSchema7>
  patternProperties?: Record<string, JSONSchema7>
  additionalProperties?: JSONSchema7 | boolean
  required?: string[]
  propertyNames?: JSONSchema7
  minProperties?: number
  maxProperties?: number
  dependencies?: Record<string, JSONSchema7 | string[]>

  // Conditionals
  if?: JSONSchema7
  then?: JSONSchema7
  else?: JSONSchema7
  allOf?: JSONSchema7[]
  anyOf?: JSONSchema7[]
  oneOf?: JSONSchema7[]
  not?: JSONSchema7

  // Content
  contentMediaType?: string
  contentEncoding?: string
}

export type JSONSchema7Type =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null'

// =====================================================
// PAYMENT REQUIREMENT TYPES
// =====================================================

/**
 * Payment scheme types
 */
export type PaymentScheme = 'exact' | 'upto' | 'base' | 'tiered'

/**
 * Standard x402 payment requirement
 */
export interface X402PaymentRequirement {
  /** Payment scheme: exact, upto, base, tiered */
  scheme: PaymentScheme

  /** Blockchain network */
  network: Network

  /** Maximum amount required (in smallest unit) */
  maxAmountRequired: string

  /** Resource identifier (usually the URL) */
  resource?: string

  /** Human-readable description */
  description?: string

  /** Expected response MIME type */
  mimeType?: string

  /** Address to pay (facilitator or direct) */
  payTo: string

  /** Maximum time to complete payment */
  maxTimeoutSeconds?: number

  /** Token/asset address */
  asset: string

  /** Additional facilitator-specific data */
  extra?: Record<string, unknown>
}

/**
 * Tiered pricing configuration
 */
export interface TieredPricing {
  tiers: Array<{
    name: string
    maxAmount: string
    features: string[]
    rateLimit?: number
  }>
}

// =====================================================
// ENHANCED X402 RESPONSE
// =====================================================

/**
 * Standard x402 response (v1.0)
 */
export interface X402ResponseV1 {
  /** Protocol version */
  x402Version: '1.0'

  /** Array of accepted payment options */
  accepts: X402PaymentRequirement[]

  /** Error message if request failed */
  error?: string
}

/**
 * Enhanced x402 response with AI integration
 *
 * Extends the standard x402 response with additional fields
 * that enable AI models to understand and use the API.
 */
export interface EnhancedX402Response extends X402ResponseV1 {
  // =====================================================
  // AI INTEGRATION FIELDS
  // =====================================================

  /**
   * JSON Schema for input parameters
   * Enables AI to understand what parameters the API accepts
   */
  inputSchema?: JSONSchema7

  /**
   * JSON Schema for output response
   * Enables AI to understand what the API returns
   */
  outputSchema?: JSONSchema7

  /**
   * Human-readable description of what the API does
   */
  description?: string

  /**
   * Short name/title for the API
   */
  name?: string

  /**
   * Tags for categorization and discovery
   */
  tags?: string[]

  /**
   * Category for the API (e.g., text-generation, code-generation)
   */
  category?: string

  /**
   * Example input/output pairs for AI context
   */
  examples?: Array<{
    input: unknown
    output: unknown
    description?: string
  }>

  // =====================================================
  // METADATA FIELDS
  // =====================================================

  /**
   * API version
   */
  apiVersion?: string

  /**
   * Supported HTTP methods
   */
  methods?: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>

  /**
   * Rate limiting information
   */
  rateLimit?: {
    requestsPerMinute?: number
    requestsPerHour?: number
    requestsPerDay?: number
  }

  /**
   * Authentication requirements beyond x402
   */
  authRequired?: {
    type: 'none' | 'bearer' | 'api_key' | 'oauth2'
    header?: string
    description?: string
  }

  /**
   * Service level agreement
   */
  sla?: {
    uptimeTarget?: number // percentage
    responseTimeP50?: number // ms
    responseTimeP99?: number // ms
  }

  /**
   * Terms of service URL
   */
  termsUrl?: string

  /**
   * Privacy policy URL
   */
  privacyUrl?: string

  /**
   * Documentation URL
   */
  docsUrl?: string

  /**
   * Support contact
   */
  support?: {
    email?: string
    url?: string
    discord?: string
  }
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate a payment requirement
 */
export function validatePaymentRequirement(
  req: unknown
): { valid: true; requirement: X402PaymentRequirement } | { valid: false; errors: string[] } {
  const errors: string[] = []
  const r = req as Record<string, unknown>

  if (!r || typeof r !== 'object') {
    return { valid: false, errors: ['Payment requirement must be an object'] }
  }

  // Required fields
  if (!r.network || typeof r.network !== 'string') {
    errors.push('Missing or invalid "network" field')
  }

  if (!r.maxAmountRequired && !r.max_amount_required && !r.amount) {
    errors.push('Missing "maxAmountRequired" field')
  }

  if (!r.payTo && !r.pay_to && !r.recipient) {
    errors.push('Missing "payTo" field')
  }

  if (!r.asset && !r.token) {
    errors.push('Missing "asset" field')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Normalize to standard format
  const requirement: X402PaymentRequirement = {
    scheme: (r.scheme ?? 'exact') as PaymentScheme,
    network: (r.network ?? r.chain) as Network,
    maxAmountRequired: String(r.maxAmountRequired ?? r.max_amount_required ?? r.amount),
    resource: r.resource as string | undefined,
    description: r.description as string | undefined,
    mimeType: (r.mimeType ?? r.mime_type) as string | undefined,
    payTo: String(r.payTo ?? r.pay_to ?? r.recipient),
    maxTimeoutSeconds: (r.maxTimeoutSeconds ?? r.max_timeout_seconds) as number | undefined,
    asset: String(r.asset ?? r.token),
    extra: r.extra as Record<string, unknown> | undefined
  }

  return { valid: true, requirement }
}

/**
 * Validate an x402 response
 */
export function validateX402Response(
  response: unknown
): { valid: true; response: EnhancedX402Response } | { valid: false; errors: string[] } {
  const errors: string[] = []
  const r = response as Record<string, unknown>

  if (!r || typeof r !== 'object') {
    return { valid: false, errors: ['Response must be an object'] }
  }

  // Check version
  const version = r.x402Version ?? r.x402_version
  if (!version) {
    errors.push('Missing "x402Version" field')
  }

  // Check accepts
  const accepts = r.accepts ?? r.payment_requirements
  if (!accepts || !Array.isArray(accepts)) {
    errors.push('Missing or invalid "accepts" array')
  } else if (accepts.length === 0) {
    errors.push('"accepts" array must not be empty')
  } else {
    // Validate each payment requirement
    for (let i = 0; i < accepts.length; i++) {
      const result = validatePaymentRequirement(accepts[i])
      if (!result.valid) {
        errors.push(`accepts[${i}]: ${result.errors.join(', ')}`)
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Normalize to enhanced format
  const enhanced: EnhancedX402Response = {
    x402Version: '1.0',
    accepts: (accepts as unknown[]).map(a => {
      const result = validatePaymentRequirement(a)
      return result.valid ? result.requirement : ({} as X402PaymentRequirement)
    }),
    error: r.error as string | undefined,
    inputSchema: (r.inputSchema ?? r.input_schema) as JSONSchema7 | undefined,
    outputSchema: (r.outputSchema ?? r.output_schema) as JSONSchema7 | undefined,
    description: r.description as string | undefined,
    name: r.name as string | undefined,
    tags: r.tags as string[] | undefined,
    category: r.category as string | undefined,
    examples: r.examples as Array<{ input: unknown; output: unknown }> | undefined,
    apiVersion: (r.apiVersion ?? r.api_version) as string | undefined,
    methods: r.methods as Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'> | undefined,
    rateLimit: (r.rateLimit ?? r.rate_limit) as EnhancedX402Response['rateLimit'],
    authRequired: (r.authRequired ?? r.auth_required) as EnhancedX402Response['authRequired'],
    sla: r.sla as EnhancedX402Response['sla'],
    termsUrl: (r.termsUrl ?? r.terms_url) as string | undefined,
    privacyUrl: (r.privacyUrl ?? r.privacy_url) as string | undefined,
    docsUrl: (r.docsUrl ?? r.docs_url) as string | undefined,
    support: r.support as EnhancedX402Response['support']
  }

  return { valid: true, response: enhanced }
}

/**
 * Parse x402 response from string
 */
export function parseX402Response(
  body: string
): { valid: true; response: EnhancedX402Response } | { valid: false; errors: string[] } {
  try {
    const parsed = JSON.parse(body)
    return validateX402Response(parsed)
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`]
    }
  }
}

// =====================================================
// SCHEMA GENERATION HELPERS
// =====================================================

/**
 * Create a basic input schema for common API patterns
 */
export function createInputSchema(options: {
  type: 'text' | 'code' | 'image' | 'audio' | 'data'
  fields?: Record<string, { type: string; description?: string; required?: boolean }>
}): JSONSchema7 {
  const baseSchemas: Record<string, JSONSchema7> = {
    text: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The text prompt or input' },
        maxTokens: { type: 'integer', description: 'Maximum tokens to generate', minimum: 1 },
        temperature: { type: 'number', description: 'Sampling temperature', minimum: 0, maximum: 2 }
      },
      required: ['prompt']
    },
    code: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The code to process' },
        language: { type: 'string', description: 'Programming language' },
        task: {
          type: 'string',
          enum: ['complete', 'explain', 'refactor', 'debug', 'test'],
          description: 'The task to perform'
        }
      },
      required: ['code']
    },
    image: {
      type: 'object',
      properties: {
        image: { type: 'string', description: 'Base64 encoded image or URL' },
        prompt: { type: 'string', description: 'Instructions for processing' }
      },
      required: ['image']
    },
    audio: {
      type: 'object',
      properties: {
        audio: { type: 'string', description: 'Base64 encoded audio or URL' },
        language: { type: 'string', description: 'Audio language code' }
      },
      required: ['audio']
    },
    data: {
      type: 'object',
      properties: {
        data: { description: 'Input data to process' },
        format: { type: 'string', description: 'Data format (json, csv, etc.)' }
      },
      required: ['data']
    }
  }

  const schema = { ...baseSchemas[options.type] }

  // Add custom fields
  if (options.fields) {
    schema.properties = { ...schema.properties }
    const required = [...(schema.required ?? [])]

    for (const [name, config] of Object.entries(options.fields)) {
      schema.properties[name] = {
        type: config.type as JSONSchema7Type,
        description: config.description
      }
      if (config.required) {
        required.push(name)
      }
    }

    schema.required = [...new Set(required)]
  }

  return schema
}

/**
 * Create a basic output schema for common API patterns
 */
export function createOutputSchema(options: {
  type: 'text' | 'code' | 'image' | 'audio' | 'data' | 'structured'
  fields?: Record<string, { type: string; description?: string }>
}): JSONSchema7 {
  const baseSchemas: Record<string, JSONSchema7> = {
    text: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Generated text' },
        tokensUsed: { type: 'integer', description: 'Number of tokens used' }
      },
      required: ['text']
    },
    code: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Generated or processed code' },
        language: { type: 'string', description: 'Programming language' },
        explanation: { type: 'string', description: 'Explanation of the code' }
      },
      required: ['code']
    },
    image: {
      type: 'object',
      properties: {
        image: { type: 'string', description: 'Base64 encoded image or URL' },
        width: { type: 'integer', description: 'Image width' },
        height: { type: 'integer', description: 'Image height' }
      },
      required: ['image']
    },
    audio: {
      type: 'object',
      properties: {
        audio: { type: 'string', description: 'Base64 encoded audio or URL' },
        duration: { type: 'number', description: 'Duration in seconds' },
        transcript: { type: 'string', description: 'Text transcript' }
      }
    },
    data: {
      type: 'object',
      properties: {
        data: { description: 'Processed data' },
        metadata: { type: 'object', description: 'Additional metadata' }
      },
      required: ['data']
    },
    structured: {
      type: 'object',
      additionalProperties: true
    }
  }

  const schema = { ...baseSchemas[options.type] }

  // Add custom fields
  if (options.fields) {
    schema.properties = { ...schema.properties }
    for (const [name, config] of Object.entries(options.fields)) {
      schema.properties[name] = {
        type: config.type as JSONSchema7Type,
        description: config.description
      }
    }
  }

  return schema
}

// =====================================================
// EXPORTS
// =====================================================

export type {
  JSONSchema7 as JSONSchema,
  JSONSchema7Type as JSONSchemaType
}
