# Plugin Components

## Table of Contents
- [Actions](#actions)
- [Evaluators](#evaluators)
- [Providers](#providers)
- [Services](#services)
- [Component Interactions](#component-interactions)

---

## Actions

Actions define agent capabilities and response mechanisms.

### Interface

```typescript
interface Action {
  name: string;                    // SCREAMING_SNAKE_CASE convention
  description: string;             // Detailed purpose for LLM selection
  similes?: string[];              // Alternative trigger phrases
  examples?: ActionExample[];      // Few-shot examples
  
  validate: Validator;             // Should this action run?
  handler: Handler;                // Execute the action
}

type Validator = (
  runtime: IAgentRuntime,
  message: Memory,
  state: State
) => Promise<boolean>;

type Handler = (
  runtime: IAgentRuntime,
  message: Memory,
  state: State,
  options: HandlerOptions,
  callback: HandlerCallback,
  responses: Memory[]
) => Promise<ActionResult>;

interface ActionResult {
  success: boolean;
  data?: Record<string, unknown>;   // Pass to next action
  values?: Record<string, unknown>; // Template variables
  text?: string;                    // Summary text
}

type HandlerCallback = (response: Content) => Promise<Memory[]>;
```

### Complete Action Example

```typescript
const transferTokenAction: Action = {
  name: 'TRANSFER_TOKEN',
  description: 'Transfer tokens to another wallet address. Use when user requests sending crypto.',
  
  similes: ['send tokens', 'transfer crypto', 'send funds'],
  
  examples: [
    {
      user: 'Send 10 SOL to abc123',
      action: 'TRANSFER_TOKEN',
    },
  ],
  
  validate: async (runtime, message, state) => {
    // Check if wallet service available
    const wallet = runtime.getService('wallet');
    if (!wallet) return false;
    
    // Check message contains transfer intent
    const text = message.content.text?.toLowerCase() ?? '';
    return text.includes('send') || text.includes('transfer');
  },
  
  handler: async (runtime, message, state, options, callback, responses) => {
    try {
      // Parse transfer details
      const { amount, recipient } = parseTransferRequest(message.content.text);
      
      // Execute transfer
      const wallet = runtime.getService<WalletService>('wallet');
      const txHash = await wallet.transfer(amount, recipient);
      
      // Send response to user
      await callback({
        text: `Transferred ${amount} to ${recipient}. TX: ${txHash}`,
        action: 'TRANSFER_TOKEN',
      });
      
      return {
        success: true,
        data: { txHash, amount, recipient },
        text: `Transfer completed: ${txHash}`,
      };
    } catch (error) {
      await callback({
        text: `Transfer failed: ${error.message}`,
        action: 'TRANSFER_TOKEN',
      });
      
      return { success: false, text: error.message };
    }
  },
};
```

### Handler Callback

The callback sends messages to users:

```typescript
await callback({
  text: 'Response text',           // Required
  action: 'ACTION_NAME',           // Action attribution
  inReplyTo: message.id,           // Thread reply
  attachments: [],                 // Media attachments
});
```

### Action Chaining

Actions can pass data via `ActionResult.data`:

```typescript
// First action
return {
  success: true,
  data: { orderId: '123', items: [...] },
};

// Next action accesses via state
handler: async (runtime, message, state) => {
  const previousData = state.data.actionResults?.[0]?.data;
  const orderId = previousData?.orderId;
}
```

---

## Evaluators

Evaluators process information after interactions for learning and reflection.

### Interface

```typescript
interface Evaluator {
  name: string;
  description: string;
  alwaysRun?: boolean;             // Skip validation, always execute
  
  validate: Validator;             // Same as Action
  handler: Handler;                // Same as Action
}
```

### Evaluator Example

```typescript
const sentimentEvaluator: Evaluator = {
  name: 'SENTIMENT_TRACKER',
  description: 'Tracks user sentiment over time for relationship building',
  alwaysRun: false,
  
  validate: async (runtime, message, state) => {
    // Only evaluate user messages, not agent responses
    return message.entityId !== runtime.agentId;
  },
  
  handler: async (runtime, message, state, options, callback) => {
    // Analyze sentiment
    const sentiment = await runtime.generateObject({
      prompt: `Analyze sentiment: "${message.content.text}"`,
      schema: z.object({
        score: z.number().min(-1).max(1),
        emotions: z.array(z.string()),
      }),
      modelType: 'OBJECT_SMALL',
    });
    
    // Store in memory for future reference
    await runtime.createMemory({
      entityId: message.entityId,
      roomId: message.roomId,
      content: {
        text: `Sentiment: ${sentiment.score}`,
        sentiment: sentiment,
      },
    }, 'sentiments');
    
    return { success: true, data: sentiment };
  },
};
```

### Evaluator Use Cases

| Use Case | Description |
|----------|-------------|
| Relationship tracking | Monitor sentiment, engagement patterns |
| Fact extraction | Store learned facts about users |
| Goal tracking | Track progress on user objectives |
| Quality assessment | Evaluate response quality |
| Memory consolidation | Summarize and compress memories |

---

## Providers

Providers supply read-only contextual information to agent prompts.

### Interface

```typescript
interface Provider {
  name: string;
  description?: string;
  position?: number;               // Order in state composition (lower = earlier)
  private?: boolean;               // Exclude from default composition
  dynamic?: boolean;               // Requires explicit inclusion
  
  get: (
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ) => Promise<ProviderResult>;
}

type ProviderResult = string | {
  text: string;
  data?: Record<string, unknown>;
  values?: Record<string, unknown>;
};
```

### Provider Example

```typescript
const walletProvider: Provider = {
  name: 'WALLET_BALANCE',
  description: 'Current wallet balances and recent transactions',
  position: 50,
  
  get: async (runtime, message, state) => {
    const wallet = runtime.getService<WalletService>('wallet');
    if (!wallet) {
      return { text: '', data: {} };
    }
    
    const balances = await wallet.getBalances();
    const recent = await wallet.getRecentTransactions(5);
    
    const text = `
Wallet Balances:
${balances.map(b => `- ${b.symbol}: ${b.amount}`).join('\n')}

Recent Transactions:
${recent.map(t => `- ${t.type}: ${t.amount} ${t.symbol}`).join('\n')}
`.trim();
    
    return {
      text,
      data: { balances, recentTransactions: recent },
      values: { 
        totalUsdValue: balances.reduce((s, b) => s + b.usdValue, 0),
      },
    };
  },
};
```

### Provider Rules

1. **Read-only**: Never modify state or call mutating APIs
2. **Idempotent**: Same inputs produce same outputs
3. **Fast**: Expensive operations should be cached
4. **Focused**: Return only relevant context

### Position Ordering

Lower position = earlier in composed state:

```typescript
// Position 10 - Core context (character, room)
// Position 50 - Domain context (wallet, knowledge)
// Position 100 - Dynamic context (recent messages)
```

---

## Services

Services manage stateful integrations with external systems.

### Abstract Class

```typescript
abstract class Service {
  static serviceType: string;              // Unique identifier
  abstract capabilityDescription: string;  // What this service provides
  config?: Record<string, unknown>;
  
  // Lifecycle
  static start(runtime: IAgentRuntime): Promise<Service>;
  abstract stop(): Promise<void>;
}

// Extended interface for typed services
interface TypedService<TInput, TOutput> extends Service {
  process(input: TInput): Promise<TOutput>;
}
```

### Service Implementation

```typescript
interface WalletConfig {
  rpcUrl: string;
  privateKey: string;
}

class WalletService extends Service {
  static serviceType = 'wallet';
  capabilityDescription = 'Manages crypto wallet operations';
  
  private client: WalletClient;
  private runtime: IAgentRuntime;
  
  constructor() {
    super();
  }
  
  static async start(runtime: IAgentRuntime): Promise<WalletService> {
    const instance = new WalletService();
    await instance.initialize(runtime);
    return instance;
  }
  
  private async initialize(runtime: IAgentRuntime) {
    this.runtime = runtime;
    
    const config: WalletConfig = {
      rpcUrl: runtime.getSetting('WALLET_RPC_URL'),
      privateKey: runtime.getSetting('WALLET_PRIVATE_KEY'),
    };
    
    this.client = new WalletClient(config);
    await this.client.connect();
    
    runtime.logger.info('Wallet service initialized');
  }
  
  async stop() {
    await this.client.disconnect();
    this.runtime.logger.info('Wallet service stopped');
  }
  
  async getBalances(): Promise<Balance[]> {
    return this.client.getBalances();
  }
  
  async transfer(amount: number, recipient: string): Promise<string> {
    return this.client.sendTransaction({ amount, recipient });
  }
}
```

### Service Access

```typescript
// In actions, providers, evaluators
const wallet = runtime.getService<WalletService>('wallet');

if (wallet) {
  const balances = await wallet.getBalances();
}
```

### Service Dependencies

Services can depend on other services:

```typescript
static async start(runtime: IAgentRuntime): Promise<MyService> {
  // Wait for dependency
  const db = runtime.getService<DatabaseService>('database');
  if (!db) {
    throw new Error('DatabaseService required');
  }
  
  const instance = new MyService(db);
  await instance.initialize(runtime);
  return instance;
}
```

---

## Component Interactions

### Data Flow

```
User Message
    │
    ▼
┌─────────────────┐
│    Providers    │ ──► Compose State
└─────────────────┘
    │
    ▼
┌─────────────────┐
│    Actions      │ ──► Validate ──► Handle ──► Response
└─────────────────┘
    │
    ▼
┌─────────────────┐
│   Evaluators    │ ──► Post-process, Learn
└─────────────────┘
    │
    ▼
┌─────────────────┐
│    Services     │ ◄── Called by any component
└─────────────────┘
```

### Accessing Components

```typescript
// In any handler
const actions = runtime.actions;           // All registered actions
const providers = runtime.providers;       // All registered providers
const evaluators = runtime.evaluators;     // All registered evaluators

// Get specific service
const service = runtime.getService<T>('service-name');

// Compose state with specific providers
const state = await runtime.composeState(message, ['WALLET_BALANCE', 'RECENT_MESSAGES']);
```
