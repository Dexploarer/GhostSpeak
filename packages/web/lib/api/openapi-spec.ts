/**
 * OpenAPI 3.0 Specification
 *
 * Complete API documentation for GhostSpeak B2B API
 */

export const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'GhostSpeak B2B API',
    version: '1.0.0',
    description:
      'Enterprise API for AI agent reputation verification. Verify agent credentials, check Ghost Scores, and manage reputation data at scale.',
    contact: {
      name: 'GhostSpeak API Support',
      email: 'api@ghostspeak.ai',
      url: 'https://ghostspeak.ai/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'https://ghostspeak.ai',
      description: 'Production',
    },
    {
      url: 'http://localhost:3000',
      description: 'Development',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
  tags: [
    {
      name: 'Verification',
      description: 'Agent verification and reputation checks',
    },
    {
      name: 'Webhooks',
      description: 'Webhook subscription management',
    },
    {
      name: 'Credentials',
      description: 'W3C Verifiable Credentials',
    },
  ],
  paths: {
    '/api/v1/verify': {
      post: {
        tags: ['Verification'],
        summary: 'Verify agent reputation',
        description:
          "Verify an AI agent's reputation with detailed metrics including Ghost Score, tier, success rate, and payment history.",
        operationId: 'verifyAgent',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['agentAddress'],
                properties: {
                  agentAddress: {
                    type: 'string',
                    description: 'Solana wallet address of the AI agent',
                    example: 'ABC123xyz...',
                  },
                  requiredScore: {
                    type: 'number',
                    description: 'Minimum Ghost Score threshold (optional)',
                    example: 500,
                  },
                  returnMetrics: {
                    type: 'boolean',
                    description: 'Include detailed performance metrics',
                    default: false,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/VerificationResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '404': {
            $ref: '#/components/responses/AgentNotFound',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/api/v1/verify/batch': {
      post: {
        tags: ['Verification'],
        summary: 'Bulk verify agents',
        description:
          'Verify multiple agents in a single request. Maximum 100 agents per request. Bulk pricing: 0.5¢ per agent.',
        operationId: 'verifyAgentsBatch',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['agents'],
                properties: {
                  agents: {
                    type: 'array',
                    description: 'Array of agent addresses to verify',
                    maxItems: 100,
                    items: {
                      type: 'string',
                    },
                    example: ['ABC123...', 'DEF456...', 'GHI789...'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Batch verification completed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BatchVerificationResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/api/v1/agents/{address}/score': {
      get: {
        tags: ['Verification'],
        summary: 'Get agent Ghost Score',
        description:
          'Lightweight endpoint to retrieve just the Ghost Score and tier. Faster and cheaper than full verification (0.5¢ vs 1¢).',
        operationId: 'getAgentScore',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            description: 'Solana wallet address of the AI agent',
            schema: {
              type: 'string',
            },
            example: 'ABC123xyz...',
          },
        ],
        responses: {
          '200': {
            description: 'Score retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ScoreResponse',
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '404': {
            $ref: '#/components/responses/AgentNotFound',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/api/v1/credentials/{id}': {
      get: {
        tags: ['Credentials'],
        summary: 'Get W3C Verifiable Credential',
        description: 'Retrieve a W3C Verifiable Credential for an agent by credential ID.',
        operationId: 'getCredential',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Credential ID',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Credential retrieved',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/VerifiableCredential',
                },
              },
            },
          },
          '404': {
            description: 'Credential not found',
          },
        },
      },
    },
    '/api/webhooks': {
      post: {
        tags: ['Webhooks'],
        summary: 'Create webhook subscription',
        description: 'Subscribe to reputation change events. Webhooks are signed with HMAC-SHA256.',
        operationId: 'createWebhook',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateWebhookRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/WebhookSubscription',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
        },
      },
      get: {
        tags: ['Webhooks'],
        summary: 'List webhook subscriptions',
        description: 'Get all webhook subscriptions for your API key.',
        operationId: 'listWebhooks',
        responses: {
          '200': {
            description: 'Webhooks retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    webhooks: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/WebhookSubscription',
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
        },
      },
    },
    '/api/webhooks/{id}': {
      get: {
        tags: ['Webhooks'],
        summary: 'Get webhook details',
        description: 'Get webhook subscription details and delivery history.',
        operationId: 'getWebhook',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Webhook retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    webhook: {
                      $ref: '#/components/schemas/WebhookSubscription',
                    },
                    deliveries: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/WebhookDelivery',
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '404': {
            description: 'Webhook not found',
          },
        },
      },
      delete: {
        tags: ['Webhooks'],
        summary: 'Delete webhook subscription',
        description: 'Delete a webhook subscription.',
        operationId: 'deleteWebhook',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Webhook deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                    },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
          '404': {
            description: 'Webhook not found',
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authentication. Format: `gs_live_...` or `gs_test_...`',
      },
    },
    schemas: {
      VerificationResponse: {
        type: 'object',
        properties: {
          verified: {
            type: 'boolean',
            description: 'Whether the agent exists and has a reputation',
          },
          ghostScore: {
            type: 'number',
            description: 'Agent reputation score (0-10,000)',
          },
          tier: {
            type: 'string',
            enum: ['NEWCOMER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'],
            description: 'Reputation tier',
          },
          meetsRequirement: {
            type: 'boolean',
            description: 'Whether agent meets the required score threshold',
          },
          metrics: {
            type: 'object',
            properties: {
              successRate: {
                type: 'number',
                description: 'Job success rate percentage',
              },
              avgResponseTime: {
                type: 'number',
                description: 'Average response time in milliseconds',
              },
              totalJobs: {
                type: 'number',
                description: 'Total completed jobs',
              },
              disputes: {
                type: 'number',
                description: 'Number of disputes',
              },
              disputeResolution: {
                type: 'string',
                description: 'Dispute resolution rate',
              },
            },
          },
          payaiData: {
            type: 'object',
            description: 'Payment history from PayAI (x402 protocol)',
            properties: {
              last30Days: {
                type: 'object',
                properties: {
                  transactions: {
                    type: 'number',
                  },
                  volume: {
                    type: 'string',
                  },
                  avgAmount: {
                    type: 'string',
                  },
                },
              },
            },
          },
          credentialId: {
            type: 'string',
            description: 'W3C Verifiable Credential ID (if issued)',
          },
          verifiedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Verification timestamp',
          },
        },
      },
      BatchVerificationResponse: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                },
                ghostScore: {
                  type: 'number',
                },
                tier: {
                  type: 'string',
                },
                verified: {
                  type: 'boolean',
                },
                error: {
                  type: 'string',
                },
              },
            },
          },
          totalCost: {
            type: 'number',
            description: 'Total cost in USD cents',
          },
          metadata: {
            type: 'object',
            properties: {
              requestedCount: {
                type: 'number',
              },
              uniqueCount: {
                type: 'number',
              },
              successCount: {
                type: 'number',
              },
              failedCount: {
                type: 'number',
              },
              responseTime: {
                type: 'string',
              },
              avgTimePerAgent: {
                type: 'string',
              },
            },
          },
        },
      },
      ScoreResponse: {
        type: 'object',
        properties: {
          ghostScore: {
            type: 'number',
          },
          tier: {
            type: 'string',
          },
          lastUpdated: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      VerifiableCredential: {
        type: 'object',
        description: 'W3C Verifiable Credential format',
        properties: {
          '@context': {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          type: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          issuer: {
            type: 'string',
          },
          issuanceDate: {
            type: 'string',
            format: 'date-time',
          },
          credentialSubject: {
            type: 'object',
          },
          proof: {
            type: 'object',
          },
        },
      },
      CreateWebhookRequest: {
        type: 'object',
        required: ['url', 'events'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: 'Webhook endpoint URL',
            example: 'https://your-app.com/webhooks/ghostspeak',
          },
          events: {
            type: 'array',
            description: 'Events to subscribe to',
            items: {
              type: 'string',
              enum: [
                'score.updated',
                'tier.changed',
                'credential.issued',
                'staking.created',
                'staking.updated',
              ],
            },
            example: ['score.updated', 'tier.changed'],
          },
          agentAddresses: {
            type: 'array',
            description: 'Optional: Filter events by specific agents',
            items: {
              type: 'string',
            },
          },
        },
      },
      WebhookSubscription: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          url: {
            type: 'string',
          },
          events: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          agentAddresses: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          secret: {
            type: 'string',
            description: 'HMAC signing secret (only returned on creation)',
          },
          isActive: {
            type: 'boolean',
          },
          totalDeliveries: {
            type: 'number',
          },
          failedDeliveries: {
            type: 'number',
          },
          lastDeliveryAt: {
            type: 'string',
            format: 'date-time',
          },
          lastFailureAt: {
            type: 'string',
            format: 'date-time',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      WebhookDelivery: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          event: {
            type: 'string',
          },
          status: {
            type: 'string',
            enum: ['pending', 'delivered', 'failed'],
          },
          attemptCount: {
            type: 'number',
          },
          lastError: {
            type: 'string',
          },
          lastResponseStatus: {
            type: 'number',
          },
          deliveredAt: {
            type: 'string',
            format: 'date-time',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Human-readable error message',
          },
          code: {
            type: 'string',
            description: 'Machine-readable error code',
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: 'Invalid request parameters',
              code: 'VALIDATION_ERROR',
            },
          },
        },
      },
      Unauthorized: {
        description: 'Missing or invalid API key',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: 'Invalid API key',
              code: 'UNAUTHORIZED',
            },
          },
        },
      },
      AgentNotFound: {
        description: 'Agent not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: 'Agent not found',
              code: 'AGENT_NOT_FOUND',
            },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
            },
          },
        },
        headers: {
          'X-RateLimit-Limit': {
            schema: {
              type: 'integer',
            },
            description: 'Request limit per minute',
          },
          'X-RateLimit-Remaining': {
            schema: {
              type: 'integer',
            },
            description: 'Remaining requests',
          },
          'X-RateLimit-Reset': {
            schema: {
              type: 'integer',
            },
            description: 'Unix timestamp when limit resets',
          },
        },
      },
    },
  },
}
