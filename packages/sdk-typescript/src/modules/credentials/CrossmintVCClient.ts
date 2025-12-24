/**
 * Crossmint Verifiable Credentials API Client
 * 
 * Integrates with Crossmint's VC system to issue and verify credentials.
 * Ported from packages/web for SDK consumption.
 */

// Constants
const CROSSMINT_STAGING_URL = 'https://staging.crossmint.com'
const CROSSMINT_PROD_URL = 'https://www.crossmint.com'

// GhostSpeak credential type names (registered with Crossmint)
export const GHOSTSPEAK_CREDENTIAL_TYPES = {
  AGENT_IDENTITY: 'GhostSpeakAgentIdentity',
  REPUTATION_SCORE: 'GhostSpeakReputation',
  JOB_COMPLETION: 'GhostSpeakJobCompletion',
} as const

interface ActionResponse {
  id: string
  status: string
  data?: {
    collection?: CredentialTemplate
  }
}

interface ErrorResponse {
  message?: string
  error?: unknown
}

// Type definitions
export interface CredentialType {
  id: string // e.g., "crossmint:xxx:MyType"
  typeSchema: {
    $schema: string
    $id: string
    title: string
    description: string
    type: string
    properties: Record<string, unknown>
  }
}

export interface CredentialTemplate {
  id: string
  metadata: {
    name: string
    description: string
    imageUrl: string
  }
  fungibility: string
  onChain: {
    chain: string
    type: string
  }
  actionId: string
}

export interface IssuedCredential {
  id: string
  credentialId: string
  onChain: {
    status: 'pending' | 'completed'
    chain: string
    contractAddress: string
    tokenId?: string
  }
  actionId: string
}

export interface VerificationResult {
  isValid: boolean
  errors?: string[]
}

export interface CrossmintClientOptions {
  apiKey: string
  environment?: 'staging' | 'production'
  chain?: 'base-sepolia' | 'polygon-amoy' | 'ethereum-sepolia' | 'base' | 'polygon' | 'ethereum'
}

/**
 * Crossmint Verifiable Credentials Client
 * 
 * Handles the complete credential lifecycle:
 * 1. Create credential types (JSON schemas)
 * 2. Create credential templates (on-chain configuration)
 * 3. Issue credentials to recipients
 * 4. Retrieve credentials
 * 5. Verify credentials
 * 6. Revoke credentials
 * 
 * NOTE: Crossmint VCs are only supported on EVM chains.
 */
export class CrossmintVCClient {
  private apiKey: string
  private baseUrl: string
  private chain: string

  constructor(options: CrossmintClientOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.environment === 'production' 
      ? CROSSMINT_PROD_URL 
      : CROSSMINT_STAGING_URL
    this.chain = options.chain || 'base-sepolia'
  }

  // ===================================
  // Types & Templates
  // ===================================

  /**
   * Create the GhostSpeak Agent Identity credential type
   */
  async createAgentIdentityType(): Promise<CredentialType> {
    const typeName = GHOSTSPEAK_CREDENTIAL_TYPES.AGENT_IDENTITY
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'GhostSpeak Agent Identity',
      description: 'Verified AI agent identity on the GhostSpeak Protocol',
      type: 'object',
      properties: {
        credentialSubject: {
          type: 'object',
          properties: {
            agentId: { type: 'string' },
            owner: { type: 'string' },
            capabilities: { type: 'array', items: { type: 'string' } },
            registeredAt: { type: 'string' },
            reputationScore: { type: 'number' },
            totalJobsCompleted: { type: 'integer' },
            verified: { type: 'boolean' },
            id: { type: 'string' }, // Auto-added by Crossmint
          },
          required: ['agentId', 'owner', 'capabilities', 'registeredAt', 'verified'],
          additionalProperties: false,
        },
      },
    }
    return this.createCredentialType(typeName, schema)
  }

  /**
   * Create the GhostSpeak Reputation credential type
   */
  async createReputationType(): Promise<CredentialType> {
    const typeName = GHOSTSPEAK_CREDENTIAL_TYPES.REPUTATION_SCORE
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'GhostSpeak Reputation',
      description: 'Verified reputation score for GhostSpeak users',
      type: 'object',
      properties: {
        credentialSubject: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            walletAddress: { type: 'string' },
            reputationScore: { type: 'number' },
            totalTransactions: { type: 'integer' },
            disputeRate: { type: 'number' },
            memberSince: { type: 'string' },
            id: { type: 'string' },
          },
          required: ['userId', 'walletAddress', 'reputationScore', 'memberSince'],
          additionalProperties: false,
        },
      },
    }
    return this.createCredentialType(typeName, schema)
  }

  /**
   * Create the GhostSpeak Job Completion credential type
   */
  async createJobCompletionType(): Promise<CredentialType> {
    const typeName = GHOSTSPEAK_CREDENTIAL_TYPES.JOB_COMPLETION
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'GhostSpeak Job Completion',
      description: 'Certificate of successful job completion on GhostSpeak',
      type: 'object',
      properties: {
        credentialSubject: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
            agentId: { type: 'string' },
            clientAddress: { type: 'string' },
            completedAt: { type: 'string' },
            amountPaid: { type: 'string' },
            rating: { type: 'integer' },
            review: { type: 'string' },
            id: { type: 'string' },
          },
          required: ['jobId', 'agentId', 'clientAddress', 'completedAt', 'amountPaid', 'rating'],
          additionalProperties: false,
        },
      },
    }
    return this.createCredentialType(typeName, schema)
  }

  /**
   * Initialize all GhostSpeak credential types
   */
  async initializeAllTypes(): Promise<{
    agentIdentity: CredentialType
    reputation: CredentialType
    jobCompletion: CredentialType
  }> {
    const [agentIdentity, reputation, jobCompletion] = await Promise.all([
      this.createAgentIdentityType(),
      this.createReputationType(),
      this.createJobCompletionType(),
    ])

    return { agentIdentity, reputation, jobCompletion }
  }

  /**
   * Create all GhostSpeak credential templates
   */
  async createAllTemplates(types: {
    agentIdentity: CredentialType
    reputation: CredentialType
    jobCompletion: CredentialType
  }): Promise<{
    agentIdentityTemplate: CredentialTemplate
    reputationTemplate: CredentialTemplate
    jobCompletionTemplate: CredentialTemplate
  }> {
    const [agentIdentityTemplate, reputationTemplate, jobCompletionTemplate] = await Promise.all([
      this.createTemplate(types.agentIdentity.id, {
        name: 'GhostSpeak Agent Identity',
        description: 'Verified AI agent identity on the GhostSpeak Protocol',
        imageUrl: 'https://www.ghostspeak.io/assets/credential-agent.png',
      }),
      this.createTemplate(types.reputation.id, {
        name: 'GhostSpeak Reputation',
        description: 'Verified reputation score for GhostSpeak users',
        imageUrl: 'https://www.ghostspeak.io/assets/credential-reputation.png',
      }),
      this.createTemplate(types.jobCompletion.id, {
        name: 'GhostSpeak Job Completion Certificate',
        description: 'Certificate of successful job completion on GhostSpeak',
        imageUrl: 'https://www.ghostspeak.io/assets/credential-job.png',
      }),
    ])

    return { agentIdentityTemplate, reputationTemplate, jobCompletionTemplate }
  }

  /**
   * Issue an agent identity credential
   */
  async issueAgentCredential(
    templateId: string,
    recipientEmail: string,
    subject: Record<string, unknown>,
    expiresAt?: string
  ): Promise<IssuedCredential> {
    return this.issueCredential(templateId, recipientEmail, subject, expiresAt)
  }

  /**
   * Issue a reputation credential
   */
  async issueReputationCredential(
    templateId: string,
    recipientEmail: string,
    subject: Record<string, unknown>,
    expiresAt?: string
  ): Promise<IssuedCredential> {
    return this.issueCredential(templateId, recipientEmail, subject, expiresAt)
  }

  /**
   * Issue a job completion credential
   */
  async issueJobCompletionCredential(
    templateId: string,
    recipientEmail: string,
    subject: Record<string, unknown>,
    expiresAt?: string
  ): Promise<IssuedCredential> {
    return this.issueCredential(templateId, recipientEmail, subject, expiresAt)
  }



  /**
   * Create a credential type (JSON Schema)
   */
  async createCredentialType(typeName: string, schema: Record<string, unknown>): Promise<CredentialType> {
    const response = await fetch(
      `${this.baseUrl}/api/v1-alpha1/credentials/types/${typeName}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify(schema),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as ErrorResponse
      throw new Error(`Failed to create credential type: ${JSON.stringify(error)}`)
    }

    return response.json() as Promise<CredentialType>
  }

  /**
   * Create a credential template
   */
  async createTemplate(
    typeId: string,
    metadata: {
      name: string
      description: string
      imageUrl: string
    }
  ): Promise<CredentialTemplate> {
    // Note: Ensuring trailing slash
    const response = await fetch(
      `${this.baseUrl}/api/v1-alpha1/credentials/templates/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          credentials: {
            type: typeId,
            encryption: 'none',
            storage: 'crossmint',
          },
          metadata,
          chain: this.chain,
        }),
      }
    )

    if (!response.ok) {
      const text = await response.text();
      try {
        const error = JSON.parse(text);
        throw new Error(`Failed to create template: ${JSON.stringify(error)}`);
      } catch (e) {
        throw new Error(`Failed to create template (${response.status}): ${text}`);
      }
    }

    const action = await response.json() as ActionResponse
    // console.log(`Template Creation Action Started: ${action.id}`)
    
    // Poll for completion
    const result = await this.waitForAction(action.id)
    
    // Return the created template
    if (result.data && result.data.collection) {
       return result.data.collection;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result.data || result) as any
  }

  /**
   * Poll an action until completion
   */
  async waitForAction(actionId: string): Promise<ActionResponse> {
    let retries = 0;
    while (retries < 60) { // 2 minutes timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(
        `${this.baseUrl}/api/2022-06-09/actions/${actionId}`,
        {
          headers: {
            'X-API-KEY': this.apiKey,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to poll action: ${response.statusText}`)
      }

      const action = await response.json() as ActionResponse
      
      if (action.status === 'succeeded') {
        return action
      }
      
      if (action.status === 'failed') {
        throw new Error(`Action failed: ${JSON.stringify(action)}`)
      }
      
      retries++
    }
    
    throw new Error('Action polling timed out')
  }

  // ===================================
  // Issuance
  // ===================================

  /**
   * Issue a credential using a template
   */
  async issueCredential(
    templateId: string,
    recipientEmail: string,
    subject: Record<string, unknown>,
    expiresAt?: string
  ): Promise<IssuedCredential> {
    const response = await fetch(
      `${this.baseUrl}/api/v1-alpha1/credentials/templates/${templateId}/vcs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          recipient: `email:${recipientEmail}:${this.chain}`,
          credential: {
            subject,
            expiresAt: expiresAt || this.getDefaultExpiry(),
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as ErrorResponse
      throw new Error(`Failed to issue credential: ${JSON.stringify(error)}`)
    }

    return response.json() as Promise<IssuedCredential>
  }

  // ===================================
  // Verification & Retrieval
  // ===================================

  async getCredential(credentialId: string): Promise<unknown> {
    const response = await fetch(
      `${this.baseUrl}/api/v1-alpha1/credentials/${credentialId}`,
      {
        headers: {
          'X-API-KEY': this.apiKey,
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as ErrorResponse
      throw new Error(`Failed to get credential: ${JSON.stringify(error)}`)
    }

    return response.json() as Promise<unknown>
  }

  async verifyCredential(credential: unknown): Promise<VerificationResult> {
    const response = await fetch(
      `${this.baseUrl}/api/v1-alpha1/credentials/verification/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({ credential }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as ErrorResponse
      throw new Error(`Failed to verify credential: ${JSON.stringify(error)}`)
    }

    return response.json() as Promise<VerificationResult>
  }

  async revokeCredential(credentialId: string): Promise<{ actionId: string; status: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/v1-alpha1/credentials/${credentialId}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-KEY': this.apiKey,
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as ErrorResponse
      throw new Error(`Failed to revoke credential: ${JSON.stringify(error)}`)
    }

    return response.json() as Promise<{ actionId: string; status: string }>
  }

  private getDefaultExpiry(): string {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)
    return date.toISOString().split('T')[0]
  }
}
