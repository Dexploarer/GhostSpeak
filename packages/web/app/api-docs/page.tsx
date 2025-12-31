/**
 * Interactive API Documentation
 *
 * Public API documentation with try-it-out functionality powered by @scalar/nextjs-api-reference
 */

'use client'

import { ApiReferenceReact } from '@scalar/nextjs-api-reference'
import { openapiSpec } from '@/lib/api/openapi-spec'

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen">
      <ApiReferenceReact
        configuration={{
          spec: {
            content: openapiSpec,
          },
          // Customization
          theme: 'default',
          layout: 'modern',
          defaultHttpClient: {
            targetKey: 'javascript',
            clientKey: 'fetch',
          },
          // Features
          showSidebar: true,
          hiddenClients: [],
          // Authentication
          authentication: {
            preferredSecurityScheme: 'ApiKeyAuth',
            apiKey: {
              token: '',
            },
          },
          // Metadata
          metadata: {
            title: 'GhostSpeak B2B API Documentation',
            description:
              'Complete API reference for GhostSpeak B2B API. Test endpoints, view examples, and integrate reputation verification into your application.',
            ogDescription:
              'Enterprise API for AI agent reputation verification. Verify credentials, check Ghost Scores, and manage reputation data at scale.',
          },
        }}
      />
    </div>
  )
}
