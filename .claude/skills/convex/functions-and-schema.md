# Functions and Schema

## Table of Contents
- [Schema Definition](#schema-definition)
- [Validators](#validators)
- [Query Functions](#query-functions)
- [Mutation Functions](#mutation-functions)
- [Action Functions](#action-functions)
- [Internal Functions](#internal-functions)
- [HTTP Actions](#http-actions)
- [Function Context](#function-context)

---

## Schema Definition

### Basic Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    createdAt: v.number(),
  }),

  posts: defineTable({
    authorId: v.id("users"),
    title: v.string(),
    body: v.string(),
    tags: v.array(v.string()),
    published: v.boolean(),
  }),
});
```

### Indexes

```typescript
// convex/schema.ts
export default defineSchema({
  messages: defineTable({
    authorId: v.id("users"),
    channel: v.string(),
    body: v.string(),
  })
    // Single field index
    .index("by_channel", ["channel"])
    
    // Compound index (order matters!)
    .index("by_channel_author", ["channel", "authorId"])
    
    // Index including _creationTime for ordering
    .index("by_author", ["authorId"]),  // implicitly includes _creationTime

  users: defineTable({
    email: v.string(),
    name: v.string(),
  })
    // Unique constraint via index
    .index("by_email", ["email"]),
});
```

### Search Indexes

```typescript
// convex/schema.ts
export default defineSchema({
  articles: defineTable({
    title: v.string(),
    body: v.string(),
    category: v.string(),
    authorId: v.id("users"),
  })
    // Full-text search index
    .searchIndex("search_content", {
      searchField: "body",
      filterFields: ["category", "authorId"],
    }),
});
```

### Vector Indexes

```typescript
// convex/schema.ts
export default defineSchema({
  documents: defineTable({
    content: v.string(),
    embedding: v.array(v.float64()),  // Vector embedding
    metadata: v.object({
      source: v.string(),
      category: v.string(),
    }),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,  // OpenAI ada-002
      filterFields: ["metadata.category"],
    }),
});
```

### System Fields

Every document automatically has:
- `_id`: `Id<"tableName">` - Unique document ID
- `_creationTime`: `number` - Unix timestamp (milliseconds)

```typescript
// These are always available
const doc = await ctx.db.get(id);
console.log(doc._id);            // Id<"messages">
console.log(doc._creationTime);  // 1703001234567
```

---

## Validators

### Primitive Validators

```typescript
import { v } from "convex/values";

// Basic types
v.string()              // string
v.number()              // number (includes floats)
v.boolean()             // boolean
v.null()                // null
v.int64()               // 64-bit integer
v.float64()             // 64-bit float
v.bytes()               // ArrayBuffer

// Document ID
v.id("users")           // Id<"users">
```

### Compound Validators

```typescript
import { v } from "convex/values";

// Array
v.array(v.string())                    // string[]
v.array(v.id("users"))                 // Id<"users">[]

// Object
v.object({
  name: v.string(),
  age: v.number(),
  email: v.optional(v.string()),
})

// Record (key-value map)
v.record(v.string(), v.number())       // Record<string, number>
v.record(v.id("users"), v.boolean())   // Record<Id<"users">, boolean>

// Union
v.union(v.string(), v.number())        // string | number
v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
)                                       // "pending" | "approved" | "rejected"

// Literal
v.literal("admin")                      // "admin" (exact value)
v.literal(42)                          // 42 (exact value)

// Optional (for function args, not schema)
v.optional(v.string())                 // string | undefined

// Any (escape hatch)
v.any()                                // any
```

### Nested Objects

```typescript
v.object({
  user: v.object({
    name: v.string(),
    contact: v.object({
      email: v.string(),
      phone: v.optional(v.string()),
    }),
  }),
  settings: v.object({
    theme: v.union(v.literal("light"), v.literal("dark")),
    notifications: v.boolean(),
  }),
})
```

### Reusable Validators

```typescript
// convex/validators.ts
import { v } from "convex/values";

export const addressValidator = v.object({
  street: v.string(),
  city: v.string(),
  country: v.string(),
  postalCode: v.string(),
});

export const userValidator = v.object({
  name: v.string(),
  email: v.string(),
  address: addressValidator,
});

// Usage in schema
import { addressValidator } from "./validators";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    address: addressValidator,
  }),
});
```

---

## Query Functions

### Basic Query

```typescript
// convex/tasks.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

### Query with Arguments

```typescript
export const listByStatus = query({
  args: {
    status: v.union(v.literal("pending"), v.literal("completed")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .take(args.limit ?? 100);
  },
});
```

### Query with Returns Validator

```typescript
export const getUser = query({
  args: { id: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

### Authenticated Query

```typescript
export const myTasks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    return await ctx.db
      .query("tasks")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .collect();
  },
});
```

### Query Naming

```typescript
// convex/users.ts - exports become api.users.X

export const get = query({ ... });        // api.users.get
export const list = query({ ... });       // api.users.list
export const search = query({ ... });     // api.users.search

// Subdirectories work too
// convex/admin/users.ts
export const list = query({ ... });       // api.admin.users.list
```

---

## Mutation Functions

### Basic Mutation

```typescript
// convex/tasks.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: "pending",
      createdAt: Date.now(),
    });
    return taskId;
  },
});
```

### Update and Delete

```typescript
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Remove undefined values
    const patch = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const replace = mutation({
  args: {
    id: v.id("tasks"),
    task: v.object({
      title: v.string(),
      status: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Replace entire document (except _id, _creationTime)
    await ctx.db.replace(args.id, args.task);
  },
});
```

### Authenticated Mutation

```typescript
export const createTask = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Look up user by identity
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.insert("tasks", {
      title: args.title,
      ownerId: user._id,
      status: "pending",
    });
  },
});
```

### Mutation with Scheduling

```typescript
import { internal } from "./_generated/api";

export const createOrder = mutation({
  args: { items: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert("orders", {
      items: args.items,
      status: "pending",
    });

    // Schedule follow-up action
    await ctx.scheduler.runAfter(0, internal.orders.processPayment, {
      orderId,
    });

    return orderId;
  },
});
```

---

## Action Functions

### Basic Action

```typescript
// convex/ai.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateImage = action({
  args: { prompt: v.string() },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: args.prompt,
        size: "1024x1024",
      }),
    });

    const data = await response.json();
    return data.data[0].url;
  },
});
```

### Action Calling Query/Mutation

```typescript
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

export const syncExternalData = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Read from database via query
    const user = await ctx.runQuery(api.users.get, { id: args.userId });
    if (!user) throw new Error("User not found");

    // Call external API
    const externalData = await fetch(`https://api.example.com/users/${user.externalId}`);
    const data = await externalData.json();

    // Write to database via mutation
    await ctx.runMutation(internal.users.updateFromExternal, {
      userId: args.userId,
      data,
    });

    return { success: true };
  },
});
```

### Node.js Runtime

```typescript
// convex/heavy.ts
"use node";  // Use Node.js runtime instead of Convex runtime

import { action } from "./_generated/server";
import { v } from "convex/values";
import puppeteer from "puppeteer";

export const screenshot = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(args.url);
    const screenshot = await page.screenshot({ encoding: "base64" });
    await browser.close();
    return screenshot;
  },
});
```

---

## Internal Functions

### Defining Internal Functions

```typescript
// convex/internal.ts
import { internalQuery, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";

// Cannot be called from client
export const getSecretData = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("secrets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const processPayment = internalMutation({
  args: { orderId: v.id("orders"), amount: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      status: "processing",
      amount: args.amount,
    });
  },
});

export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify(args),
    });
  },
});
```

### Calling Internal Functions

```typescript
import { internal } from "./_generated/api";

// From a mutation
export const createOrder = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    // Schedule internal action
    await ctx.scheduler.runAfter(0, internal.orders.processPayment, {
      orderId,
    });
  },
});

// From an action
export const processOrder = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    // Call internal query
    const order = await ctx.runQuery(internal.orders.getInternal, {
      id: args.orderId,
    });

    // Call internal mutation
    await ctx.runMutation(internal.orders.updateStatus, {
      orderId: args.orderId,
      status: "completed",
    });
  },
});
```

---

## HTTP Actions

### Basic HTTP Endpoint

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    
    // Validate webhook signature
    const signature = request.headers.get("x-signature");
    if (!validateSignature(signature, body)) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Process webhook
    await ctx.runMutation(internal.webhooks.process, { data: body });

    return new Response("OK", { status: 200 });
  }),
});

http.route({
  path: "/api/users/{userId}",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.pathname.split("/").pop();

    const user = await ctx.runQuery(api.users.get, { id: userId });
    if (!user) {
      return new Response("Not found", { status: 404 });
    }

    return Response.json(user);
  }),
});

export default http;
```

### CORS Headers

```typescript
http.route({
  path: "/api/data",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const data = await ctx.runQuery(api.data.list, {});

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// Handle preflight
http.route({
  path: "/api/data",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});
```

---

## Function Context

### Query Context (`QueryCtx`)

```typescript
export const myQuery = query({
  handler: async (ctx) => {
    // Database reader (read-only)
    ctx.db.get(id);
    ctx.db.query("table");

    // Authentication
    const identity = await ctx.auth.getUserIdentity();

    // Storage (read URLs)
    const url = await ctx.storage.getUrl(storageId);
  },
});
```

### Mutation Context (`MutationCtx`)

```typescript
export const myMutation = mutation({
  handler: async (ctx) => {
    // Database writer (read + write)
    ctx.db.insert("table", doc);
    ctx.db.patch(id, updates);
    ctx.db.replace(id, doc);
    ctx.db.delete(id);

    // Authentication
    const identity = await ctx.auth.getUserIdentity();

    // Storage
    const uploadUrl = await ctx.storage.generateUploadUrl();
    await ctx.storage.delete(storageId);

    // Scheduler
    await ctx.scheduler.runAfter(1000, internal.func, args);
    await ctx.scheduler.runAt(timestamp, internal.func, args);
  },
});
```

### Action Context (`ActionCtx`)

```typescript
export const myAction = action({
  handler: async (ctx) => {
    // Run queries and mutations
    await ctx.runQuery(api.query, args);
    await ctx.runMutation(internal.mutation, args);
    await ctx.runAction(internal.action, args);

    // Authentication
    const identity = await ctx.auth.getUserIdentity();

    // Storage
    const uploadUrl = await ctx.storage.generateUploadUrl();
    const url = await ctx.storage.getUrl(storageId);

    // Scheduler
    await ctx.scheduler.runAfter(1000, internal.func, args);

    // Vector search (actions only)
    const results = await ctx.vectorSearch("documents", "by_embedding", {
      vector: embedding,
      limit: 10,
    });
  },
});
```
