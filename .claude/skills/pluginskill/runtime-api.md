# Runtime API Reference

## Table of Contents
- [IAgentRuntime Interface](#iagentruntime-interface)
- [Memory Operations](#memory-operations)
- [Model Operations](#model-operations)
- [Event System](#event-system)
- [Utility Methods](#utility-methods)

---

## IAgentRuntime Interface

The `IAgentRuntime` is the core execution context passed to all plugin components.

### Key Properties

```typescript
interface IAgentRuntime {
  // Identity
  agentId: UUID;
  character: Character;
  
  // Registered components
  actions: Action[];
  providers: Provider[];
  evaluators: Evaluator[];
  plugins: Plugin[];
  
  // Logging
  logger: Logger;
  
  // Database
  adapter: IDatabaseAdapter;
}
```

### Core Methods Overview

| Category | Methods |
|----------|---------|
| Memory | `createMemory`, `searchMemories`, `getMemoryById`, `addEmbeddingToMemory` |
| Models | `useModel`, `generateText`, `generateObject`, `registerModel`, `getModel` |
| State | `composeState`, `composePromptFromState` |
| Services | `getService`, `registerService`, `getAllServices` |
| Events | `emitEvent`, `registerEvent` |
| Settings | `getSetting`, `getSettings` |

---

## Memory Operations

### Memory Interface

```typescript
interface Memory {
  id?: UUID;
  entityId: UUID;                  // Who created this memory
  agentId?: UUID;                  // Which agent owns it
  roomId: UUID;                    // Conversation context
  worldId?: UUID;                  // World context
  content: Content;                // Actual content
  embedding?: number[];            // Vector embedding
  createdAt?: Date;
  unique?: boolean;                // Prevent duplicates
}

interface Content {
  text?: string;
  action?: string;
  inReplyTo?: UUID;
  attachments?: Attachment[];
  [key: string]: unknown;          // Custom fields
}
```

### Creating Memories

```typescript
// Basic memory creation
await runtime.createMemory({
  entityId: message.entityId,
  roomId: message.roomId,
  content: {
    text: 'User prefers dark mode',
    type: 'preference',
  },
}, 'facts');  // Table name

// With embedding (auto-generated if not provided)
const memory: Memory = {
  entityId: userId,
  roomId: roomId,
  content: { text: 'Important fact about user' },
};
await runtime.addEmbeddingToMemory(memory);
await runtime.createMemory(memory, 'knowledge');
```

### Searching Memories

```typescript
// Semantic search with embedding
const results = await runtime.searchMemories({
  embedding: queryEmbedding,       // Pre-computed embedding
  roomId: message.roomId,          // Optional filter
  count: 10,                       // Max results
  match_threshold: 0.7,            // Similarity threshold (0-1)
  tableName: 'facts',              // Memory table
});

// Search with text query (auto-embeds)
const memories = await runtime.searchMemories({
  query: 'user preferences',       // Will be embedded
  roomId: roomId,
  count: 5,
});
```

### Memory Tables

| Table | Purpose |
|-------|---------|
| `messages` | Conversation history |
| `facts` | Extracted facts about entities |
| `knowledge` | RAG knowledge base |
| `goals` | User goals and objectives |
| Custom | Plugin-specific storage |

### Embedding Generation

```typescript
// Generate embedding for text
const embedding = await runtime.useModel('TEXT_EMBEDDING', {
  input: 'Text to embed',
});

// Queue async embedding (non-blocking)
runtime.queueEmbeddingGeneration(memory);

// Listen for completion
runtime.registerEvent('EMBEDDING_GENERATION_COMPLETED', async (payload) => {
  console.log('Embedding ready:', payload.memoryId);
});
```

---

## Model Operations

### Model Types

```typescript
type ModelTypeName =
  | 'TEXT_SMALL'      // Fast, cheap text generation
  | 'TEXT_LARGE'      // High-quality text generation
  | 'TEXT_EMBEDDING'  // Vector embeddings
  | 'OBJECT_SMALL'    // Fast structured output
  | 'OBJECT_LARGE'    // Complex structured output
  | 'IMAGE'           // Image generation
  | 'AUDIO'           // Audio generation/transcription
  | 'VIDEO';          // Video generation
```

### useModel

Low-level model invocation:

```typescript
// Text generation
const response = await runtime.useModel('TEXT_LARGE', {
  prompt: 'Explain quantum computing',
  temperature: 0.7,
  maxTokens: 1000,
});

// Structured output
const data = await runtime.useModel('OBJECT_SMALL', {
  prompt: 'Extract entities from: "John works at Google"',
  schema: z.object({
    entities: z.array(z.object({
      name: z.string(),
      type: z.enum(['PERSON', 'ORG', 'LOCATION']),
    })),
  }),
});

// Explicit provider
const response = await runtime.useModel('TEXT_LARGE', params, {
  provider: 'openai',  // Override priority-based selection
});
```

### generateText

Convenience method with character context:

```typescript
// Includes character bio, system prompt, style
const response = await runtime.generateText('Write a haiku about coding');

// Without character context
const response = await runtime.generateText('Translate: Hello', {
  includeCharacter: false,
});

// With model override
const response = await runtime.generateText('Quick summary', {
  modelType: 'TEXT_SMALL',
  temperature: 0.3,
});
```

### generateObject

Structured output generation:

```typescript
const analysis = await runtime.generateObject({
  prompt: 'Analyze this code for bugs',
  schema: z.object({
    hasBugs: z.boolean(),
    bugs: z.array(z.object({
      line: z.number(),
      description: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })),
    suggestions: z.array(z.string()),
  }),
  modelType: 'OBJECT_LARGE',
});

// analysis is fully typed
if (analysis.hasBugs) {
  analysis.bugs.forEach(bug => console.log(bug.description));
}
```

### Registering Custom Models

```typescript
// In plugin
const myPlugin: Plugin = {
  models: {
    TEXT_LARGE: async (runtime, params) => {
      const response = await myLLMProvider.generate(params.prompt);
      return response.text;
    },
    TEXT_EMBEDDING: async (runtime, params) => {
      return myEmbeddingProvider.embed(params.input);
    },
  },
  priority: 100,  // Higher = preferred
};

// Or programmatically
runtime.registerModel(
  'TEXT_LARGE',
  myHandler,
  'my-provider',
  100  // priority
);
```

### Model Configuration Hierarchy

Parameters resolve in order (first wins):

1. Direct call parameters
2. Model-specific settings (`TEXT_LARGE_TEMPERATURE`)
3. Default settings (`DEFAULT_TEMPERATURE`)
4. Legacy settings (`MODEL_TEMPERATURE`)

```typescript
// character.json
{
  "settings": {
    "TEXT_LARGE_TEMPERATURE": 0.9,   // For TEXT_LARGE only
    "DEFAULT_TEMPERATURE": 0.7,       // Fallback
    "DEFAULT_MAX_TOKENS": 2000
  }
}
```

---

## Event System

### Event Types

```typescript
enum EventType {
  // Messages
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_SENT = 'MESSAGE_SENT',
  MESSAGE_DELETED = 'MESSAGE_DELETED',
  VOICE_MESSAGE_RECEIVED = 'VOICE_MESSAGE_RECEIVED',
  VOICE_MESSAGE_SENT = 'VOICE_MESSAGE_SENT',
  
  // World/Room
  WORLD_JOINED = 'WORLD_JOINED',
  WORLD_CONNECTED = 'WORLD_CONNECTED',
  WORLD_LEFT = 'WORLD_LEFT',
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_LEFT = 'ROOM_LEFT',
  
  // Entities
  ENTITY_JOINED = 'ENTITY_JOINED',
  ENTITY_LEFT = 'ENTITY_LEFT',
  ENTITY_UPDATED = 'ENTITY_UPDATED',
  
  // Interactions
  REACTION_RECEIVED = 'REACTION_RECEIVED',
  POST_GENERATED = 'POST_GENERATED',
  INTERACTION_RECEIVED = 'INTERACTION_RECEIVED',
  
  // Runtime
  RUN_STARTED = 'RUN_STARTED',
  RUN_ENDED = 'RUN_ENDED',
  RUN_TIMEOUT = 'RUN_TIMEOUT',
  
  // Actions/Evaluators
  ACTION_STARTED = 'ACTION_STARTED',
  ACTION_COMPLETED = 'ACTION_COMPLETED',
  EVALUATOR_STARTED = 'EVALUATOR_STARTED',
  EVALUATOR_COMPLETED = 'EVALUATOR_COMPLETED',
  
  // Models
  MODEL_USED = 'MODEL_USED',
  
  // Embeddings
  EMBEDDING_GENERATION_REQUESTED = 'EMBEDDING_GENERATION_REQUESTED',
  EMBEDDING_GENERATION_COMPLETED = 'EMBEDDING_GENERATION_COMPLETED',
  EMBEDDING_GENERATION_FAILED = 'EMBEDDING_GENERATION_FAILED',
  
  // Control
  CONTROL_MESSAGE = 'CONTROL_MESSAGE',
}
```

### Event Payloads

```typescript
// All payloads include
interface EventPayload {
  runtime: IAgentRuntime;
  source: string;
}

// Message events
interface MessagePayload extends EventPayload {
  message: Memory;
}

// World events
interface WorldPayload extends EventPayload {
  world: World;
}

// Action events
interface ActionPayload extends EventPayload {
  action: Action;
  result?: ActionResult;
}
```

### Registering Event Handlers

```typescript
// In plugin definition
const myPlugin: Plugin = {
  events: {
    [EventType.MESSAGE_RECEIVED]: [
      async (payload: MessagePayload) => {
        console.log('Message:', payload.message.content.text);
      },
    ],
    [EventType.ACTION_COMPLETED]: [
      async (payload: ActionPayload) => {
        if (payload.result?.success) {
          console.log('Action succeeded:', payload.action.name);
        }
      },
    ],
  },
};

// Programmatically
runtime.registerEvent(EventType.WORLD_JOINED, async (payload) => {
  console.log('Joined world:', payload.world.name);
});
```

### Emitting Events

```typescript
// Emit custom events
await runtime.emitEvent(EventType.CONTROL_MESSAGE, {
  runtime,
  source: 'my-plugin',
  message: {
    payload: { action: 'custom_action' },
    roomId: roomId,
  },
});
```

---

## Utility Methods

### Settings

```typescript
// Get single setting
const apiKey = runtime.getSetting('OPENAI_API_KEY');

// Get all settings
const settings = runtime.getSettings();
```

### Logging

```typescript
runtime.logger.info('Operation completed');
runtime.logger.debug({ data }, 'Debug info');
runtime.logger.warn('Warning message');
runtime.logger.error({ error }, 'Error occurred');
```

### Service Access

```typescript
// Get typed service
const wallet = runtime.getService<WalletService>('wallet');

// Get all services
const services = runtime.getAllServices();  // Map<string, Service>

// Check service exists
const hasWallet = runtime.getService('wallet') !== undefined;
```

### Database Adapter

```typescript
// Direct adapter access (advanced)
const adapter = runtime.adapter;

// Query with adapter
const results = await adapter.searchMemories({
  tableName: 'custom_table',
  roomId: roomId,
  embedding: vector,
  match_count: 10,
});
```
