# AI Integration Examples

This directory contains examples for integrating AI models and services with the GhostSpeak protocol.

## Examples

### 1. Agent-to-AI Integration (`agent-ai-integration.ts`)
- Connect agents to AI models
- Process requests through AI
- Handle AI responses and payments

### 2. Multi-Model Orchestration (`multi-model-orchestration.ts`)
- Coordinate multiple AI models
- Load balancing across providers
- Fallback and error handling

### 3. Custom AI Workflows (`custom-workflows.ts`)
- Build complex AI workflows
- Chain multiple AI operations
- Custom prompt engineering

## Key Concepts

### AI Provider Integration

```typescript
interface AIProvider {
  name: string                    // Provider name (OpenAI, Anthropic, etc.)
  models: string[]               // Available models
  pricing: PricingModel          // Cost structure
  capabilities: string[]         // Supported capabilities
}
```

### Workflow Orchestration

```typescript
interface AIWorkflow {
  steps: WorkflowStep[]          // Sequential processing steps
  fallbacks: string[]            // Fallback providers
  costLimit: bigint              // Maximum cost per request
  timeout: number                // Request timeout
}
```

## Running the Examples

```bash
# Install dependencies
bun install

# Run a specific example
bun run agent-ai-integration.ts
bun run multi-model-orchestration.ts

# Run all examples
bun run all
```