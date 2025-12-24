/**
 * x402 OpenAI Tools API Route
 *
 * GET /api/x402/tools/openai - Get OpenAI function calling schemas for x402 resources
 */

import { NextRequest, NextResponse } from 'next/server'

// =====================================================
// TYPES
// =====================================================

interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: string
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

interface OpenAIToolsResponse {
  tools: OpenAITool[]
  total: number
  usage: string
}

// =====================================================
// MOCK DATA
// =====================================================

const MOCK_TOOLS: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'ghostspeak_text_generate',
      description:
        'Generate high-quality text using advanced AI models with x402 micropayments. Cost: 0.001 USDC per request on Solana.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The text prompt to generate from',
          },
          maxTokens: {
            type: 'integer',
            description: 'Maximum number of tokens to generate',
            default: 1024,
          },
          temperature: {
            type: 'number',
            description: 'Sampling temperature (0-2)',
            default: 0.7,
          },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'payai_code_complete',
      description:
        'AI-powered code completion and generation. Cost: 0.005 USDC per request on Base.',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The input code to process',
          },
          language: {
            type: 'string',
            description: 'Programming language of the code',
          },
          task: {
            type: 'string',
            enum: ['complete', 'explain', 'refactor', 'debug', 'test'],
            description: 'The task to perform on the code',
          },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'aurra_summarize',
      description:
        'Summarize long documents and articles using AI. Cost: 0.002 USDC per request on Solana.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to summarize',
          },
          length: {
            type: 'string',
            enum: ['short', 'medium', 'long'],
            description: 'Desired summary length',
          },
        },
        required: ['text'],
      },
    },
  },
]

const USAGE_EXAMPLE = `// Install the GhostSpeak SDK
npm install @ghostspeak/sdk

// Example usage with OpenAI
import OpenAI from 'openai';
import { fetchWithX402Payment } from '@ghostspeak/sdk/x402';

const client = new OpenAI();

// Fetch tools from this API
const toolsResponse = await fetch('/api/x402/tools/openai');
const { tools } = await toolsResponse.json();

// Use with OpenAI
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Generate a haiku about AI' }],
  tools,
  tool_choice: 'auto'
});

// Handle tool calls
for (const toolCall of response.choices[0].message.tool_calls ?? []) {
  const args = JSON.parse(toolCall.function.arguments);
  
  // Map tool name to URL (you'd fetch this from the API)
  const toolUrls = {
    'ghostspeak_text_generate': 'https://api.ghostspeak.ai/v1/generate',
    'payai_code_complete': 'https://api.payai.network/code/complete',
    'aurra_summarize': 'https://api.aurra.cloud/v1/summarize'
  };
  
  const url = toolUrls[toolCall.function.name];
  
  const result = await fetchWithX402Payment(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    },
    wallet // Your Solana wallet signer
  );
  
  console.log(await result.json());
}`

// =====================================================
// GET HANDLER
// =====================================================

export async function GET(request: NextRequest): Promise<NextResponse<OpenAIToolsResponse>> {
  const searchParams = request.nextUrl.searchParams

  // Parse query parameters
  const _category = searchParams.get('category')
  const _network = searchParams.get('network')

  // In production, this would filter tools based on parameters
  const filtered = [...MOCK_TOOLS]

  // Note: In a real implementation, we'd filter by category and network
  // based on the underlying resources

  return NextResponse.json({
    tools: filtered,
    total: filtered.length,
    usage: USAGE_EXAMPLE,
  })
}
