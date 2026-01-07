/**
 * RAG Instance Setup
 *
 * Configures the Convex RAG component using the Gateway-Ghost logic.
 * reuses the same Vercel AI Gateway and Model as @ghostspeak/plugin-gateway-ghost.
 * Model: openai/text-embedding-3-large (3072 dimensions)
 */

import { RAG } from '@convex-dev/rag'
import { createOpenAI } from '@ai-sdk/openai'
import { components } from './_generated/api'

// Initialize the OpenAI client pointing to the Vercel AI Gateway (Gateway-Ghost)
export const gateway = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
})

// Configure the RAG component with the text embedding model
// Note: @ai-sdk/openai expects just the model ID, not the gateway routing format
export const rag = new RAG(components.rag, {
  textEmbeddingModel: gateway.embedding('text-embedding-3-large'),
  embeddingDimension: 3072,
})
