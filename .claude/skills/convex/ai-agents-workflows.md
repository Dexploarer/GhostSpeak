# AI Agents and Workflows

## Table of Contents
- [AI Agent Component](#ai-agent-component)
- [Vector Search for RAG](#vector-search-for-rag)
- [Durable Workflows](#durable-workflows)
- [Streaming Responses](#streaming-responses)
- [Tool Calling](#tool-calling)
- [Multi-Agent Patterns](#multi-agent-patterns)

---

## AI Agent Component

### Installation

```bash
npm install @convex-dev/agent
```

### Basic Agent Setup

```typescript
// convex/agents.ts
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";

export const supportAgent = new Agent(components.agent, {
  name: "Support Agent",
  
  chat: {
    model: "gpt-4-turbo",
    systemPrompt: `You are a helpful customer support agent. 
    Be friendly, professional, and helpful.
    If you don't know something, say so honestly.`,
  },
  
  // Optional: Enable message history search
  textEmbedding: {
    model: "text-embedding-3-small",
    dimensions: 1536,
  },
});
```

### Using the Agent

```typescript
// convex/support.ts
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { supportAgent } from "./agents";

// Create a new conversation thread
export const createThread = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await supportAgent.createThread(ctx, {
      userId: args.userId,
      metadata: { source: "web" },
    });
  },
});

// Send a message and get response
export const chat = action({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await supportAgent.generateText(
      ctx,
      { threadId: args.threadId },
      { prompt: args.message }
    );

    return result.text;
  },
});

// Get thread history
export const getHistory = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    return await supportAgent.getMessages(ctx, {
      threadId: args.threadId,
    });
  },
});
```

### Agent with Tools

```typescript
// convex/agents.ts
import { Agent } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";

export const orderAgent = new Agent(components.agent, {
  name: "Order Agent",
  
  chat: {
    model: "gpt-4-turbo",
    systemPrompt: `You help customers with their orders.
    Use the available tools to look up order information.`,
  },
  
  tools: {
    getOrder: {
      description: "Look up an order by its ID",
      parameters: {
        orderId: { type: "string", description: "The order ID" },
      },
      handler: async (ctx, args) => {
        const order = await ctx.runQuery(internal.orders.get, {
          id: args.orderId,
        });
        return order;
      },
    },
    
    cancelOrder: {
      description: "Cancel an order",
      parameters: {
        orderId: { type: "string", description: "The order ID" },
        reason: { type: "string", description: "Cancellation reason" },
      },
      handler: async (ctx, args) => {
        await ctx.runMutation(internal.orders.cancel, {
          id: args.orderId,
          reason: args.reason,
        });
        return { success: true };
      },
    },
  },
});
```

### React Integration

```typescript
"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect } from "react";

export function ChatInterface({ userId }: { userId: string }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const createThread = useMutation(api.support.createThread);
  const chat = useAction(api.support.chat);
  const messages = useQuery(
    api.support.getHistory,
    threadId ? { threadId } : "skip"
  );

  // Create thread on mount
  useEffect(() => {
    createThread({ userId }).then(setThreadId);
  }, [userId]);

  const handleSend = async () => {
    if (!threadId || !input.trim()) return;
    
    setLoading(true);
    try {
      await chat({ threadId, message: input });
      setInput("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="messages">
        {messages?.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleSend()}
        disabled={loading}
      />
      <button onClick={handleSend} disabled={loading}>
        Send
      </button>
    </div>
  );
}
```

---

## Vector Search for RAG

### Schema Setup

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    embedding: v.array(v.float64()),
    metadata: v.object({
      source: v.string(),
      category: v.string(),
    }),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["metadata.category"],
    }),

  chunks: defineTable({
    documentId: v.id("documents"),
    content: v.string(),
    embedding: v.array(v.float64()),
    chunkIndex: v.number(),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
    })
    .index("by_document", ["documentId"]),
});
```

### Ingestion Pipeline

```typescript
// convex/ingest.ts
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const ingestDocument = action({
  args: {
    title: v.string(),
    content: v.string(),
    source: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    // Chunk the content
    const chunks = chunkText(args.content, 1000, 200);

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks);

    // Store document and chunks
    await ctx.runMutation(internal.ingest.storeDocument, {
      title: args.title,
      content: args.content,
      source: args.source,
      category: args.category,
      chunks: chunks.map((content, i) => ({
        content,
        embedding: embeddings[i],
        chunkIndex: i,
      })),
    });
  },
});

export const storeDocument = internalMutation({
  args: {
    title: v.string(),
    content: v.string(),
    source: v.string(),
    category: v.string(),
    chunks: v.array(v.object({
      content: v.string(),
      embedding: v.array(v.float64()),
      chunkIndex: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Store main document with embedding of full content
    const docEmbedding = await ctx.runAction(internal.embeddings.generate, {
      text: args.title + " " + args.content.slice(0, 500),
    });

    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content,
      embedding: docEmbedding,
      metadata: {
        source: args.source,
        category: args.category,
      },
    });

    // Store chunks
    for (const chunk of args.chunks) {
      await ctx.db.insert("chunks", {
        documentId,
        content: chunk.content,
        embedding: chunk.embedding,
        chunkIndex: chunk.chunkIndex,
      });
    }

    return documentId;
  },
});

// Helper functions
function chunkText(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
    }),
  });

  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}
```

### RAG Query

```typescript
// convex/rag.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const query = action({
  args: {
    question: v.string(),
    category: v.optional(v.string()),
    topK: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for question
    const questionEmbedding = await generateEmbedding(args.question);

    // Search for relevant chunks
    const results = await ctx.vectorSearch("chunks", "by_embedding", {
      vector: questionEmbedding,
      limit: args.topK ?? 5,
    });

    // Fetch full chunk content
    const chunks = await Promise.all(
      results.map(async (result) => {
        const chunk = await ctx.runQuery(api.chunks.get, { id: result._id });
        return {
          content: chunk?.content ?? "",
          score: result._score,
        };
      })
    );

    // Build context from chunks
    const context = chunks
      .map((c) => c.content)
      .join("\n\n---\n\n");

    // Generate answer with context
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `Answer questions based on the provided context.
            If the answer isn't in the context, say so.
            
            Context:
            ${context}`,
          },
          {
            role: "user",
            content: args.question,
          },
        ],
      }),
    });

    const data = await response.json();
    return {
      answer: data.choices[0].message.content,
      sources: chunks,
    };
  },
});
```

---

## Durable Workflows

### Workflow Component Setup

```bash
npm install @convex-dev/workflow
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import workflow from "@convex-dev/workflow/convex.config";

const app = defineApp();
app.use(workflow);

export default app;
```

### Defining Workflows

```typescript
// convex/workflows.ts
import { Workflow } from "@convex-dev/workflow";
import { components, internal } from "./_generated/api";
import { v } from "convex/values";

const workflow = new Workflow(components.workflow);

// Define a multi-step workflow
export const orderWorkflow = workflow.define({
  args: {
    orderId: v.id("orders"),
    userId: v.id("users"),
  },
  handler: async (step, args) => {
    // Step 1: Validate order
    const order = await step.runQuery(internal.orders.get, {
      id: args.orderId,
    });
    if (!order) throw new Error("Order not found");

    // Step 2: Process payment (with retry)
    const paymentResult = await step.runAction(
      internal.payments.process,
      { orderId: args.orderId, amount: order.total },
      { retry: { maxAttempts: 3, backoff: "exponential" } }
    );

    // Step 3: Update order status
    await step.runMutation(internal.orders.updateStatus, {
      orderId: args.orderId,
      status: "paid",
      paymentId: paymentResult.id,
    });

    // Step 4: Send confirmation email
    await step.runAction(internal.emails.sendOrderConfirmation, {
      userId: args.userId,
      orderId: args.orderId,
    });

    // Step 5: Wait for fulfillment (with timeout)
    await step.sleep(1000 * 60 * 60);  // 1 hour

    // Step 6: Check fulfillment status
    const updatedOrder = await step.runQuery(internal.orders.get, {
      id: args.orderId,
    });

    if (updatedOrder?.status !== "shipped") {
      // Send reminder to warehouse
      await step.runAction(internal.notifications.warehouseReminder, {
        orderId: args.orderId,
      });
    }

    return { success: true, orderId: args.orderId };
  },
});

// Start a workflow
export const startOrderWorkflow = mutation({
  args: { orderId: v.id("orders"), userId: v.id("users") },
  handler: async (ctx, args) => {
    return await orderWorkflow.start(ctx, args);
  },
});
```

### Workflow with Parallel Steps

```typescript
// convex/workflows.ts
export const enrichmentWorkflow = workflow.define({
  args: { leadId: v.id("leads") },
  handler: async (step, args) => {
    const lead = await step.runQuery(internal.leads.get, { id: args.leadId });

    // Run multiple enrichments in parallel
    const [companyData, socialData, emailVerification] = await Promise.all([
      step.runAction(internal.enrichment.company, { domain: lead.domain }),
      step.runAction(internal.enrichment.social, { email: lead.email }),
      step.runAction(internal.enrichment.verifyEmail, { email: lead.email }),
    ]);

    // Combine results
    await step.runMutation(internal.leads.update, {
      id: args.leadId,
      companyData,
      socialData,
      emailValid: emailVerification.valid,
    });

    return { enriched: true };
  },
});
```

### Conditional Workflow Steps

```typescript
export const approvalWorkflow = workflow.define({
  args: { requestId: v.id("requests") },
  handler: async (step, args) => {
    const request = await step.runQuery(internal.requests.get, {
      id: args.requestId,
    });

    if (request.amount > 10000) {
      // Requires manager approval
      await step.runMutation(internal.requests.requestApproval, {
        requestId: args.requestId,
        level: "manager",
      });

      // Wait for approval (with timeout)
      const approved = await step.waitForCondition(
        async () => {
          const req = await step.runQuery(internal.requests.get, {
            id: args.requestId,
          });
          return req?.status === "approved" || req?.status === "rejected";
        },
        { timeout: 1000 * 60 * 60 * 24 * 7 }  // 7 days
      );

      if (!approved) {
        await step.runMutation(internal.requests.expire, {
          requestId: args.requestId,
        });
        return { status: "expired" };
      }
    }

    // Process the request
    await step.runAction(internal.requests.process, {
      requestId: args.requestId,
    });

    return { status: "completed" };
  },
});
```

---

## Streaming Responses

### Streaming Component

```bash
npm install @convex-dev/streaming
```

```typescript
// convex/streaming.ts
import { Streaming } from "@convex-dev/streaming";
import { components } from "./_generated/api";

export const streaming = new Streaming(components.streaming);
```

### Streaming Action

```typescript
// convex/chat.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { streaming } from "./streaming";

export const streamResponse = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // Create a stream
    const stream = await streaming.create(ctx);

    // Start streaming in background
    (async () => {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4-turbo",
            messages: [{ role: "user", content: args.prompt }],
            stream: true,
          }),
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              await stream.push(content);
            }
          }
        }

        await stream.complete();
      } catch (error) {
        await stream.error(error instanceof Error ? error.message : "Unknown error");
      }
    })();

    return stream.id;
  },
});
```

### React Streaming Hook

```typescript
"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

export function StreamingChat() {
  const [streamId, setStreamId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const startStream = useAction(api.chat.streamResponse);
  const streamData = useQuery(
    api.streaming.get,
    streamId ? { id: streamId } : "skip"
  );

  const handleSubmit = async () => {
    const id = await startStream({ threadId: "123", prompt });
    setStreamId(id);
  };

  return (
    <div>
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button onClick={handleSubmit}>Send</button>

      <div className="response">
        {streamData?.chunks.join("")}
        {streamData?.status === "streaming" && <span className="cursor">▊</span>}
      </div>
    </div>
  );
}
```

---

## Tool Calling

### Defining Tools

```typescript
// convex/tools.ts
import { v } from "convex/values";

export const tools = {
  getCurrentWeather: {
    name: "getCurrentWeather",
    description: "Get the current weather in a location",
    parameters: v.object({
      location: v.string(),
      unit: v.optional(v.union(v.literal("celsius"), v.literal("fahrenheit"))),
    }),
    handler: async (args: { location: string; unit?: string }) => {
      const response = await fetch(
        `https://api.weather.com/v1?location=${args.location}`
      );
      return await response.json();
    },
  },

  searchDatabase: {
    name: "searchDatabase",
    description: "Search the product database",
    parameters: v.object({
      query: v.string(),
      category: v.optional(v.string()),
      limit: v.optional(v.number()),
    }),
    handler: async (ctx: any, args: any) => {
      return await ctx.runQuery(internal.products.search, args);
    },
  },

  createTask: {
    name: "createTask",
    description: "Create a new task for the user",
    parameters: v.object({
      title: v.string(),
      dueDate: v.optional(v.string()),
      priority: v.optional(v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      )),
    }),
    handler: async (ctx: any, args: any) => {
      return await ctx.runMutation(internal.tasks.create, args);
    },
  },
};
```

### Tool Calling Loop

```typescript
// convex/assistant.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { tools } from "./tools";

export const chat = action({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    const messages = [{ role: "user", content: args.message }];

    // Convert tools to OpenAI format
    const openaiTools = Object.values(tools).map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: Object.fromEntries(
            Object.entries(tool.parameters.fields).map(([k, v]) => [
              k,
              { type: v.kind, description: v.description },
            ])
          ),
        },
      },
    }));

    // Tool calling loop
    while (true) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages,
          tools: openaiTools,
        }),
      });

      const data = await response.json();
      const choice = data.choices[0];

      // If no tool calls, return the response
      if (choice.finish_reason === "stop") {
        return choice.message.content;
      }

      // Handle tool calls
      if (choice.message.tool_calls) {
        messages.push(choice.message);

        for (const toolCall of choice.message.tool_calls) {
          const tool = tools[toolCall.function.name as keyof typeof tools];
          const args = JSON.parse(toolCall.function.arguments);

          const result = await tool.handler(ctx, args);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
      }
    }
  },
});
```

---

## Multi-Agent Patterns

### Agent Handoff

```typescript
// convex/multiAgent.ts
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";

// Triage agent routes to specialists
export const triageAgent = new Agent(components.agent, {
  name: "Triage Agent",
  chat: {
    model: "gpt-4-turbo",
    systemPrompt: `You route customer inquiries to the right specialist.
    Respond with JSON: { "route": "billing" | "technical" | "sales" }`,
  },
});

export const billingAgent = new Agent(components.agent, {
  name: "Billing Agent",
  chat: {
    model: "gpt-4-turbo",
    systemPrompt: "You handle billing and payment questions.",
  },
});

export const technicalAgent = new Agent(components.agent, {
  name: "Technical Agent",
  chat: {
    model: "gpt-4-turbo",
    systemPrompt: "You provide technical support.",
  },
});

// Router action
export const routeMessage = action({
  args: { threadId: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    // Get routing decision
    const routingResult = await triageAgent.generateText(
      ctx,
      { threadId: args.threadId },
      { prompt: args.message }
    );

    const routing = JSON.parse(routingResult.text);

    // Route to specialist
    const agent = routing.route === "billing" ? billingAgent
      : routing.route === "technical" ? technicalAgent
      : salesAgent;

    const response = await agent.generateText(
      ctx,
      { threadId: args.threadId },
      { prompt: args.message }
    );

    return {
      route: routing.route,
      response: response.text,
    };
  },
});
```

### Supervisor Pattern

```typescript
// convex/supervisor.ts
export const supervisorWorkflow = workflow.define({
  args: { task: v.string() },
  handler: async (step, args) => {
    // Supervisor plans the work
    const plan = await step.runAction(internal.agents.plan, {
      task: args.task,
    });

    const results: any[] = [];

    // Execute each subtask with appropriate agent
    for (const subtask of plan.subtasks) {
      const result = await step.runAction(internal.agents.execute, {
        subtask,
        agentType: subtask.agent,
      });
      results.push(result);
    }

    // Supervisor synthesizes results
    const synthesis = await step.runAction(internal.agents.synthesize, {
      task: args.task,
      results,
    });

    return synthesis;
  },
});
```
