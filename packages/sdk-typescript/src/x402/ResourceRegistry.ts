/**
 * x402 Resource Registry
 *
 * Service for registering, validating, and managing x402 resources.
 * Handles resource discovery, ping checks, and metadata scraping.
 *
 * @module x402/ResourceRegistry
 */

import { EventEmitter } from 'node:events'
import type { PaymentRequirement, DiscoveredResource } from './FacilitatorClient.js'
import type { Network } from './FacilitatorRegistry.js'

// =====================================================
// TYPES
// =====================================================

/**
 * Standard x402 response schema
 */
export interface X402Response {
  x402Version: string
  accepts: PaymentRequirement[]
  error?: string
}

/**
 * Enhanced x402 response with AI integration fields
 */
export interface EnhancedX402Response extends X402Response {
  inputSchema?: JSONSchema
  outputSchema?: JSONSchema
  description?: string
  tags?: string[]
  examples?: Array<{ input: unknown; output: unknown }>
  name?: string
  category?: string
}

/**
 * JSON Schema type (simplified)
 */
export interface JSONSchema {
  type?: string | string[]
  properties?: Record<string, JSONSchema>
  items?: JSONSchema | JSONSchema[]
  required?: string[]
  description?: string
  enum?: unknown[]
  default?: unknown
  format?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  additionalProperties?: boolean | JSONSchema
  $ref?: string
  $defs?: Record<string, JSONSchema>
  allOf?: JSONSchema[]
  anyOf?: JSONSchema[]
  oneOf?: JSONSchema[]
  title?: string
}

/**
 * Resource registration request
 */
export interface RegisterResourceRequest {
  url: string
  facilitatorId?: string
  tags?: string[]
  forceRefresh?: boolean
}

/**
 * Resource registration result
 */
export interface RegisterResourceResult {
  success: boolean
  resourceId?: string
  resource?: RegisteredResource
  error?: string
  validationErrors?: string[]
}

/**
 * Registered resource data
 */
export interface RegisteredResource {
  id: string
  url: string
  type: string
  x402Version: string
  originId?: string
  facilitatorId?: string
  accepts: PaymentRequirement[]
  maxAmount?: bigint
  inputSchema?: JSONSchema
  outputSchema?: JSONSchema
  description?: string
  name?: string
  tags: string[]
  category?: string
  isActive: boolean
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Resource ping result
 */
export interface PingResult {
  url: string
  success: boolean
  statusCode?: number
  latencyMs: number
  hasValidX402: boolean
  x402Response?: EnhancedX402Response
  error?: string
  parseError?: string
}

/**
 * Origin metadata from scraping
 */
export interface OriginMetadata {
  origin: string
  name?: string
  description?: string
  faviconUrl?: string
  ogImageUrl?: string
  ogTitle?: string
  ogDescription?: string
  twitterHandle?: string
  githubRepo?: string
}

/**
 * Resource search options
 */
export interface ResourceSearchOptions {
  query?: string
  tags?: string[]
  category?: string
  network?: Network
  token?: string
  minPrice?: bigint
  maxPrice?: bigint
  isActive?: boolean
  isVerified?: boolean
  facilitatorId?: string
  page?: number
  pageSize?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'name'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Resource search result
 */
export interface ResourceSearchResult {
  resources: RegisteredResource[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * AI labeling result
 */
export interface AILabelingResult {
  resourceId: string
  tags: string[]
  category?: string
  description?: string
  confidence: number
}

/**
 * Resource registry options
 */
export interface ResourceRegistryOptions {
  pingTimeout?: number
  userAgent?: string
  enableAILabeling?: boolean
  aiLabelingApiKey?: string
  aiLabelingModel?: string
}

/**
 * Resource registry events
 */
export interface ResourceRegistryEvents {
  'resource:registered': (resource: RegisteredResource) => void
  'resource:updated': (resource: RegisteredResource) => void
  'resource:pinged': (result: PingResult) => void
  'origin:scraped': (metadata: OriginMetadata) => void
  'error': (error: Error) => void
}

// =====================================================
// RESOURCE REGISTRY CLASS
// =====================================================

/**
 * Registry for managing x402 resources
 */
export class ResourceRegistry extends EventEmitter {
  private readonly pingTimeout: number
  private readonly userAgent: string
  private readonly enableAILabeling: boolean
  private readonly aiLabelingApiKey?: string
  private readonly aiLabelingModel: string

  // In-memory cache (would be replaced with database in production)
  private resources: Map<string, RegisteredResource> = new Map()
  private origins: Map<string, OriginMetadata> = new Map()
  private urlToId: Map<string, string> = new Map()

  constructor(options?: ResourceRegistryOptions) {
    super()
    this.pingTimeout = options?.pingTimeout ?? 10_000
    this.userAgent = options?.userAgent ?? 'GhostSpeak-ResourceRegistry/1.0'
    this.enableAILabeling = options?.enableAILabeling ?? false
    this.aiLabelingApiKey = options?.aiLabelingApiKey
    this.aiLabelingModel = options?.aiLabelingModel ?? 'gpt-4o-mini'
  }

  // =====================================================
  // RESOURCE REGISTRATION
  // =====================================================

  /**
   * Register a new x402 resource
   */
  async registerResource(request: RegisterResourceRequest): Promise<RegisterResourceResult> {
    try {
      // Validate URL
      const url = this.normalizeUrl(request.url)
      if (!this.isValidUrl(url)) {
        return {
          success: false,
          error: 'Invalid URL format',
          validationErrors: ['URL must be a valid HTTP or HTTPS URL']
        }
      }

      // Check if already registered
      const existingId = this.urlToId.get(url)
      if (existingId && !request.forceRefresh) {
        const existing = this.resources.get(existingId)
        if (existing) {
          return {
            success: true,
            resourceId: existingId,
            resource: existing
          }
        }
      }

      // Ping the resource to validate x402 response
      const pingResult = await this.pingResource(url)

      if (!pingResult.success) {
        return {
          success: false,
          error: `Failed to reach resource: ${pingResult.error}`,
          validationErrors: pingResult.parseError ? [pingResult.parseError] : undefined
        }
      }

      if (!pingResult.hasValidX402 || !pingResult.x402Response) {
        return {
          success: false,
          error: 'Resource does not return a valid x402 response',
          validationErrors: pingResult.parseError ? [pingResult.parseError] : undefined
        }
      }

      // Scrape origin metadata
      const origin = this.extractOrigin(url)
      let originMetadata = this.origins.get(origin)
      if (!originMetadata || request.forceRefresh) {
        originMetadata = await this.scrapeOriginMetadata(origin)
        this.origins.set(origin, originMetadata)
      }

      // Generate resource ID
      const resourceId = existingId ?? this.generateId()

      // Calculate max amount from accepts
      const maxAmount = this.calculateMaxAmount(pingResult.x402Response.accepts)

      // Build resource object
      const resource: RegisteredResource = {
        id: resourceId,
        url,
        type: 'http',
        x402Version: pingResult.x402Response.x402Version,
        originId: origin,
        facilitatorId: request.facilitatorId,
        accepts: pingResult.x402Response.accepts,
        maxAmount,
        inputSchema: pingResult.x402Response.inputSchema,
        outputSchema: pingResult.x402Response.outputSchema,
        description: pingResult.x402Response.description ?? originMetadata.ogDescription,
        name: pingResult.x402Response.name ?? this.extractResourceName(url),
        tags: [...(request.tags ?? []), ...(pingResult.x402Response.tags ?? [])],
        category: pingResult.x402Response.category,
        isActive: true,
        isVerified: false,
        createdAt: existingId ? (this.resources.get(existingId)?.createdAt ?? new Date()) : new Date(),
        updatedAt: new Date()
      }

      // Store resource
      this.resources.set(resourceId, resource)
      this.urlToId.set(url, resourceId)

      // AI labeling if enabled and no tags/category
      if (this.enableAILabeling && resource.tags.length === 0) {
        this.labelWithAI(resourceId).catch(err => this.emit('error', err))
      }

      this.emit('resource:registered', resource)

      return {
        success: true,
        resourceId,
        resource
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.emit('error', error as Error)
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Register multiple resources from discovery
   */
  async registerFromDiscovery(
    discoveredResources: DiscoveredResource[]
  ): Promise<Map<string, RegisterResourceResult>> {
    const results = new Map<string, RegisterResourceResult>()

    for (const discovered of discoveredResources) {
      const result = await this.registerResource({
        url: discovered.url,
        facilitatorId: discovered.facilitatorId,
        tags: discovered.tags
      })
      results.set(discovered.url, result)
    }

    return results
  }

  // =====================================================
  // RESOURCE PINGING
  // =====================================================

  /**
   * Ping a resource to check health and validate x402 response
   */
  async pingResource(url: string): Promise<PingResult> {
    const startTime = Date.now()
    const normalizedUrl = this.normalizeUrl(url)

    try {
      // First try GET to trigger 402
      const response = await fetch(normalizedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(this.pingTimeout)
      })

      const latencyMs = Date.now() - startTime

      // Check for 402 status
      if (response.status !== 402) {
        // Try POST if GET didn't return 402
        const postResponse = await fetch(normalizedUrl, {
          method: 'POST',
          headers: {
            'User-Agent': this.userAgent,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(this.pingTimeout)
        })

        if (postResponse.status !== 402) {
          const result: PingResult = {
            url: normalizedUrl,
            success: true,
            statusCode: response.status,
            latencyMs,
            hasValidX402: false,
            error: `Expected 402 status, got ${response.status}`
          }
          this.emit('resource:pinged', result)
          return result
        }

        // Use POST response
        return this.processX402Response(normalizedUrl, postResponse, Date.now() - startTime)
      }

      return this.processX402Response(normalizedUrl, response, latencyMs)
    } catch (error) {
      const latencyMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      const result: PingResult = {
        url: normalizedUrl,
        success: false,
        latencyMs,
        hasValidX402: false,
        error: errorMessage
      }
      this.emit('resource:pinged', result)
      return result
    }
  }

  /**
   * Process x402 response from a 402 status
   */
  private async processX402Response(
    url: string,
    response: Response,
    latencyMs: number
  ): Promise<PingResult> {
    try {
      const body = await response.text()
      const parsed = this.parseX402Response(body)

      if (!parsed.success) {
        const result: PingResult = {
          url,
          success: true,
          statusCode: 402,
          latencyMs,
          hasValidX402: false,
          parseError: parsed.error
        }
        this.emit('resource:pinged', result)
        return result
      }

      const result: PingResult = {
        url,
        success: true,
        statusCode: 402,
        latencyMs,
        hasValidX402: true,
        x402Response: parsed.response
      }
      this.emit('resource:pinged', result)
      return result
    } catch (error) {
      const result: PingResult = {
        url,
        success: true,
        statusCode: 402,
        latencyMs,
        hasValidX402: false,
        parseError: error instanceof Error ? error.message : 'Failed to parse response'
      }
      this.emit('resource:pinged', result)
      return result
    }
  }

  // =====================================================
  // X402 RESPONSE PARSING
  // =====================================================

  /**
   * Parse and validate x402 response body
   */
  parseX402Response(body: string): { success: true; response: EnhancedX402Response } | { success: false; error: string } {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>

      // Validate required fields
      if (!parsed.x402Version && !parsed.x402_version) {
        return { success: false, error: 'Missing x402Version field' }
      }

      if (!parsed.accepts && !parsed.payment_requirements) {
        return { success: false, error: 'Missing accepts field' }
      }

      // Normalize field names (snake_case to camelCase)
      const normalized: EnhancedX402Response = {
        x402Version: (parsed.x402Version ?? parsed.x402_version) as string,
        accepts: this.normalizeAccepts(
          (parsed.accepts ?? parsed.payment_requirements) as unknown[]
        ),
        error: parsed.error as string | undefined,
        inputSchema: (parsed.inputSchema ?? parsed.input_schema) as JSONSchema | undefined,
        outputSchema: (parsed.outputSchema ?? parsed.output_schema) as JSONSchema | undefined,
        description: parsed.description as string | undefined,
        tags: parsed.tags as string[] | undefined,
        examples: parsed.examples as Array<{ input: unknown; output: unknown }> | undefined,
        name: parsed.name as string | undefined,
        category: parsed.category as string | undefined
      }

      // Validate accepts array
      if (!Array.isArray(normalized.accepts) || normalized.accepts.length === 0) {
        return { success: false, error: 'accepts must be a non-empty array' }
      }

      // Validate each payment requirement
      for (const accept of normalized.accepts) {
        const validation = this.validatePaymentRequirement(accept)
        if (!validation.valid) {
          return { success: false, error: validation.error! }
        }
      }

      return { success: true, response: normalized }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse JSON'
      }
    }
  }

  /**
   * Normalize accepts array
   */
  private normalizeAccepts(accepts: unknown[]): PaymentRequirement[] {
    return accepts.map(accept => {
      const a = accept as Record<string, unknown>
      return {
        scheme: (a.scheme ?? 'exact') as string,
        network: (a.network ?? a.chain) as Network,
        maxAmountRequired: (a.maxAmountRequired ?? a.max_amount_required ?? a.amount) as string,
        resource: a.resource as string,
        description: a.description as string | undefined,
        mimeType: (a.mimeType ?? a.mime_type) as string | undefined,
        payTo: (a.payTo ?? a.pay_to ?? a.recipient) as string,
        maxTimeoutSeconds: (a.maxTimeoutSeconds ?? a.max_timeout_seconds) as number | undefined,
        asset: (a.asset ?? a.token) as string,
        extra: a.extra as Record<string, unknown> | undefined
      }
    })
  }

  /**
   * Validate a payment requirement
   */
  private validatePaymentRequirement(req: PaymentRequirement): { valid: boolean; error?: string } {
    if (!req.network) {
      return { valid: false, error: 'Payment requirement missing network' }
    }
    if (!req.maxAmountRequired) {
      return { valid: false, error: 'Payment requirement missing maxAmountRequired' }
    }
    if (!req.payTo) {
      return { valid: false, error: 'Payment requirement missing payTo' }
    }
    if (!req.asset) {
      return { valid: false, error: 'Payment requirement missing asset' }
    }
    return { valid: true }
  }

  // =====================================================
  // ORIGIN METADATA SCRAPING
  // =====================================================

  /**
   * Scrape metadata from resource origin
   */
  async scrapeOriginMetadata(origin: string): Promise<OriginMetadata> {
    const metadata: OriginMetadata = { origin }

    try {
      const response = await fetch(origin, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html'
        },
        signal: AbortSignal.timeout(10_000)
      })

      if (!response.ok) {
        this.emit('origin:scraped', metadata)
        return metadata
      }

      const html = await response.text()

      // Extract Open Graph tags
      metadata.ogTitle = this.extractMetaContent(html, 'og:title')
      metadata.ogDescription = this.extractMetaContent(html, 'og:description')
      metadata.ogImageUrl = this.extractMetaContent(html, 'og:image')

      // Extract basic meta tags as fallback
      metadata.name = metadata.ogTitle ?? this.extractMetaContent(html, 'title') ?? this.extractTitle(html)
      metadata.description = metadata.ogDescription ?? this.extractMetaContent(html, 'description')

      // Extract favicon
      metadata.faviconUrl = this.extractFavicon(html, origin)

      // Extract social links
      metadata.twitterHandle = this.extractTwitterHandle(html)
      metadata.githubRepo = this.extractGithubRepo(html)

      this.emit('origin:scraped', metadata)
      return metadata
    } catch (error) {
      this.emit('error', error as Error)
      return metadata
    }
  }

  /**
   * Extract meta content by name or property
   */
  private extractMetaContent(html: string, name: string): string | undefined {
    // Try property attribute (Open Graph)
    const propertyMatch = html.match(
      new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
    )
    if (propertyMatch?.[1]) return propertyMatch[1]

    // Try content before property
    const propertyMatch2 = html.match(
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i')
    )
    if (propertyMatch2?.[1]) return propertyMatch2[1]

    // Try name attribute
    const nameMatch = html.match(
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
    )
    if (nameMatch?.[1]) return nameMatch[1]

    return undefined
  }

  /**
   * Extract page title
   */
  private extractTitle(html: string): string | undefined {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return match?.[1]?.trim()
  }

  /**
   * Extract favicon URL
   */
  private extractFavicon(html: string, origin: string): string {
    // Look for link rel="icon"
    const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
    if (iconMatch?.[1]) {
      const href = iconMatch[1]
      if (href.startsWith('http')) return href
      if (href.startsWith('//')) return `https:${href}`
      if (href.startsWith('/')) return `${origin}${href}`
      return `${origin}/${href}`
    }
    // Default to /favicon.ico
    return `${origin}/favicon.ico`
  }

  /**
   * Extract Twitter handle
   */
  private extractTwitterHandle(html: string): string | undefined {
    const match = html.match(/<meta[^>]+name=["']twitter:site["'][^>]+content=["']@?([^"']+)["']/i)
    return match?.[1] ? `@${match[1].replace('@', '')}` : undefined
  }

  /**
   * Extract GitHub repo
   */
  private extractGithubRepo(html: string): string | undefined {
    const match = html.match(/href=["']https?:\/\/github\.com\/([^"'/]+\/[^"'/]+)["']/i)
    return match?.[1]
  }

  // =====================================================
  // AI LABELING
  // =====================================================

  /**
   * Label a resource with AI-generated tags and category
   */
  async labelWithAI(resourceId: string): Promise<AILabelingResult | null> {
    if (!this.enableAILabeling || !this.aiLabelingApiKey) {
      return null
    }

    const resource = this.resources.get(resourceId)
    if (!resource) return null

    try {
      // Build prompt
      const prompt = this.buildLabelingPrompt(resource)

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.aiLabelingApiKey}`
        },
        body: JSON.stringify({
          model: this.aiLabelingModel,
          messages: [
            {
              role: 'system',
              content: 'You are an API categorization assistant. Analyze x402 API resources and suggest appropriate tags and categories.'
            },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>
      }

      const content = data.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      const parsed = JSON.parse(content) as {
        tags?: string[]
        category?: string
        description?: string
        confidence?: number
      }

      const result: AILabelingResult = {
        resourceId,
        tags: parsed.tags ?? [],
        category: parsed.category,
        description: parsed.description,
        confidence: parsed.confidence ?? 0.5
      }

      // Update resource with AI labels
      resource.tags = [...new Set([...resource.tags, ...result.tags])]
      if (result.category) resource.category = result.category
      if (result.description && !resource.description) resource.description = result.description
      resource.updatedAt = new Date()

      this.resources.set(resourceId, resource)
      this.emit('resource:updated', resource)

      return result
    } catch (error) {
      this.emit('error', error as Error)
      return null
    }
  }

  /**
   * Build labeling prompt for AI
   */
  private buildLabelingPrompt(resource: RegisteredResource): string {
    const categories = [
      'text-generation',
      'code-generation',
      'data-analysis',
      'image-processing',
      'audio-processing',
      'video-processing',
      'translation',
      'summarization',
      'search',
      'embedding',
      'classification',
      'extraction',
      'moderation',
      'other'
    ]

    return `Analyze this x402 API resource and suggest appropriate tags and category.

URL: ${resource.url}
Name: ${resource.name ?? 'Unknown'}
Description: ${resource.description ?? 'No description'}
Input Schema: ${resource.inputSchema ? JSON.stringify(resource.inputSchema, null, 2) : 'None'}
Output Schema: ${resource.outputSchema ? JSON.stringify(resource.outputSchema, null, 2) : 'None'}
Payment: ${resource.maxAmount?.toString() ?? 'Unknown'} (network: ${resource.accepts[0]?.network ?? 'unknown'})

Available categories: ${categories.join(', ')}

Respond with JSON:
{
  "tags": ["tag1", "tag2", "tag3"],
  "category": "one of the available categories",
  "description": "a brief description if none exists",
  "confidence": 0.0 to 1.0
}`
  }

  // =====================================================
  // RESOURCE QUERIES
  // =====================================================

  /**
   * Get a resource by ID
   */
  get(id: string): RegisteredResource | undefined {
    return this.resources.get(id)
  }

  /**
   * Get a resource by URL
   */
  getByUrl(url: string): RegisteredResource | undefined {
    const id = this.urlToId.get(this.normalizeUrl(url))
    return id ? this.resources.get(id) : undefined
  }

  /**
   * Get all resources
   */
  getAll(): RegisteredResource[] {
    return Array.from(this.resources.values())
  }

  /**
   * Search resources
   */
  search(options: ResourceSearchOptions): ResourceSearchResult {
    let results = this.getAll()

    // Filter by query
    if (options.query) {
      const query = options.query.toLowerCase()
      results = results.filter(
        r =>
          r.name?.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.url.toLowerCase().includes(query) ||
          r.tags.some(t => t.toLowerCase().includes(query))
      )
    }

    // Filter by tags
    if (options.tags?.length) {
      results = results.filter(r => options.tags!.some(tag => r.tags.includes(tag)))
    }

    // Filter by category
    if (options.category) {
      results = results.filter(r => r.category === options.category)
    }

    // Filter by network
    if (options.network) {
      results = results.filter(r => r.accepts.some(a => a.network === options.network))
    }

    // Filter by token
    if (options.token) {
      const token = options.token.toLowerCase()
      results = results.filter(r =>
        r.accepts.some(a => a.asset.toLowerCase() === token)
      )
    }

    // Filter by price range
    if (options.minPrice != null) {
      results = results.filter(r => r.maxAmount != null && r.maxAmount >= options.minPrice!)
    }
    if (options.maxPrice != null) {
      results = results.filter(r => r.maxAmount != null && r.maxAmount <= options.maxPrice!)
    }

    // Filter by status
    if (options.isActive != null) {
      results = results.filter(r => r.isActive === options.isActive)
    }
    if (options.isVerified != null) {
      results = results.filter(r => r.isVerified === options.isVerified)
    }

    // Filter by facilitator
    if (options.facilitatorId) {
      results = results.filter(r => r.facilitatorId === options.facilitatorId)
    }

    // Sort
    const sortBy = options.sortBy ?? 'createdAt'
    const sortOrder = options.sortOrder ?? 'desc'
    results.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = (a.name ?? '').localeCompare(b.name ?? '')
          break
        case 'price':
          comparison = Number(a.maxAmount ?? 0n) - Number(b.maxAmount ?? 0n)
          break
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
          break
        case 'createdAt':
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    // Paginate
    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 20
    const start = (page - 1) * pageSize
    const paginatedResults = results.slice(start, start + pageSize)

    return {
      resources: paginatedResults,
      total: results.length,
      page,
      pageSize,
      hasMore: start + pageSize < results.length
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Normalize URL
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      // Remove trailing slash
      return parsed.toString().replace(/\/$/, '')
    } catch {
      return url
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Extract origin from URL
   */
  private extractOrigin(url: string): string {
    try {
      const parsed = new URL(url)
      return parsed.origin
    } catch {
      return url
    }
  }

  /**
   * Extract resource name from URL
   */
  private extractResourceName(url: string): string {
    try {
      const parsed = new URL(url)
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      return pathParts[pathParts.length - 1] ?? parsed.hostname
    } catch {
      return url
    }
  }

  /**
   * Calculate max amount from accepts array
   */
  private calculateMaxAmount(accepts: PaymentRequirement[]): bigint | undefined {
    if (!accepts.length) return undefined
    const amounts = accepts
      .map(a => {
        try {
          return BigInt(a.maxAmountRequired)
        } catch {
          return 0n
        }
      })
      .filter(a => a > 0n)
    if (!amounts.length) return undefined
    return amounts.reduce((max, a) => (a > max ? a : max), 0n)
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `res_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  /**
   * Clear all resources
   */
  clear(): void {
    this.resources.clear()
    this.origins.clear()
    this.urlToId.clear()
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalResources: number
    activeResources: number
    verifiedResources: number
    totalOrigins: number
    byNetwork: Record<string, number>
    byCategory: Record<string, number>
  } {
    const resources = this.getAll()
    const byNetwork: Record<string, number> = {}
    const byCategory: Record<string, number> = {}

    for (const resource of resources) {
      for (const accept of resource.accepts) {
        byNetwork[accept.network] = (byNetwork[accept.network] ?? 0) + 1
      }
      if (resource.category) {
        byCategory[resource.category] = (byCategory[resource.category] ?? 0) + 1
      }
    }

    return {
      totalResources: resources.length,
      activeResources: resources.filter(r => r.isActive).length,
      verifiedResources: resources.filter(r => r.isVerified).length,
      totalOrigins: this.origins.size,
      byNetwork,
      byCategory
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create a new resource registry
 */
export function createResourceRegistry(options?: ResourceRegistryOptions): ResourceRegistry {
  return new ResourceRegistry(options)
}
