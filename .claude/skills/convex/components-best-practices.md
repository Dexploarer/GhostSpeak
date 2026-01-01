# Components and Best Practices

## Table of Contents
- [Convex Components](#convex-components)
- [Available Components](#available-components)
- [Using Components](#using-components)
- [Security Best Practices](#security-best-practices)
- [Performance Optimization](#performance-optimization)
- [Code Organization](#code-organization)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Convex Components

### What Are Components?

Components are modular, reusable backend building blocks that:
- Run in isolated sandboxes with their own tables
- Cannot access your app's data without explicit API calls
- Are installed via npm like any package
- Provide type-safe APIs

### Installing Components

```bash
# Install a component
npm install @convex-dev/agent
npm install @convex-dev/workflow
npm install @convex-dev/rate-limiter
```

### Component Configuration

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";

const app = defineApp();
app.use(agent);
app.use(workflow);
app.use(rateLimiter);

export default app;
```

---

## Available Components

### AI & Machine Learning

| Component | Description | Install |
|-----------|-------------|---------|
| **Agent** | AI agents with memory, tool calling, workflows | `@convex-dev/agent` |
| **Streaming** | Stream text responses to browser | `@convex-dev/streaming` |
| **Action Cache** | Cache expensive AI calls | `@convex-dev/action-cache` |

### Backend Infrastructure

| Component | Description | Install |
|-----------|-------------|---------|
| **Workflow** | Durable multi-step workflows | `@convex-dev/workflow` |
| **Workpool** | Parallelism limits and retries | `@convex-dev/workpool` |
| **Action Retrier** | Retry failed actions | `@convex-dev/action-retrier` |
| **Rate Limiter** | Application-layer rate limits | `@convex-dev/rate-limiter` |
| **Crons** | Advanced cron scheduling | `@convex-dev/crons` |

### Data Management

| Component | Description | Install |
|-----------|-------------|---------|
| **Aggregate** | Scalable sums and counts | `@convex-dev/aggregate` |
| **Counter** | High-throughput counters | `@convex-dev/counter` |
| **Migrations** | Data migration framework | `@convex-dev/migrations` |
| **Geospatial** | Location-based queries | `@convex-dev/geospatial` |

### Integrations

| Component | Description | Install |
|-----------|-------------|---------|
| **Stripe** | Payments and subscriptions | `@convex-dev/stripe` |
| **Resend** | Transactional emails | `@convex-dev/resend` |
| **Expo Push** | Push notifications | `@convex-dev/expo-push` |
| **Twilio** | SMS messaging | `@convex-dev/twilio` |

---

## Using Components

### Rate Limiter Example

```typescript
// convex/rateLimiter.ts
import { RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // 100 requests per minute per user
  userRequests: {
    kind: "token bucket",
    rate: 100,
    period: 60 * 1000,  // 1 minute
    capacity: 100,
  },
  
  // 10 API calls per second globally
  apiCalls: {
    kind: "fixed window",
    rate: 10,
    period: 1000,  // 1 second
  },
});

// Usage in mutation
import { mutation } from "./_generated/server";
import { rateLimiter } from "./rateLimiter";

export const sendMessage = mutation({
  args: { body: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Check rate limit
    const result = await rateLimiter.check(ctx, "userRequests", {
      key: identity.subject,
      count: 1,
    });

    if (!result.ok) {
      throw new Error(`Rate limited. Retry after ${result.retryAfter}ms`);
    }

    return await ctx.db.insert("messages", { body: args.body });
  },
});
```

### Aggregate Example

```typescript
// convex/analytics.ts
import { Aggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";

export const viewCounter = new Aggregate(components.aggregate);

// Increment on page view
export const trackView = mutation({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    await viewCounter.increment(ctx, {
      key: `page:${args.pageId}`,
      count: 1,
    });
  },
});

// Get total views
export const getViews = query({
  args: { pageId: v.string() },
  handler: async (ctx, args) => {
    return await viewCounter.get(ctx, { key: `page:${args.pageId}` });
  },
});
```

### Stripe Example

```typescript
// convex/stripe.ts
import { Stripe } from "@convex-dev/stripe";
import { components } from "./_generated/api";

export const stripe = new Stripe(components.stripe, {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});

// Create checkout session
export const createCheckout = action({
  args: { priceId: v.string() },
  handler: async (ctx, args) => {
    return await stripe.createCheckoutSession(ctx, {
      priceId: args.priceId,
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });
  },
});

// Handle webhook
export const handleWebhook = stripe.webhookHandler({
  "checkout.session.completed": async (ctx, event) => {
    const session = event.data.object;
    await ctx.runMutation(internal.subscriptions.activate, {
      customerId: session.customer,
    });
  },
});
```

---

## Security Best Practices

### Always Validate Arguments

```typescript
// ❌ Bad: No validation
export const update = mutation({
  handler: async (ctx, args: any) => {
    await ctx.db.patch(args.id, args.update);
  },
});

// ✅ Good: Explicit validation
export const update = mutation({
  args: {
    id: v.id("posts"),
    update: v.object({
      title: v.optional(v.string()),
      body: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.update);
  },
});
```

### Check Authentication

```typescript
// ✅ Always verify identity
export const createPost = mutation({
  args: { title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Use identity.subject or look up user
    return await ctx.db.insert("posts", {
      ...args,
      authorId: identity.subject,
    });
  },
});
```

### Check Authorization

```typescript
// ✅ Verify ownership/permissions
export const deletePost = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Post not found");

    // Check ownership
    if (post.authorId !== identity.subject) {
      throw new Error("Not authorized to delete this post");
    }

    await ctx.db.delete(args.id);
  },
});
```

### Use Internal Functions for Sensitive Operations

```typescript
// convex/sensitive.ts
import { internalMutation } from "./_generated/server";

// ✅ Internal functions can't be called from client
export const adminOperation = internalMutation({
  args: { ... },
  handler: async (ctx, args) => {
    // Sensitive operation
  },
});
```

### Validate Unguessable IDs

```typescript
// ❌ Bad: Email can be guessed
export const getUserData = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

// ✅ Good: ID is unguessable
export const getUserData = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

---

## Performance Optimization

### Use Indexes

```typescript
// ❌ Bad: Full table scan
const posts = await ctx.db
  .query("posts")
  .filter((q) => q.eq(q.field("authorId"), userId))
  .collect();

// ✅ Good: Index lookup
const posts = await ctx.db
  .query("posts")
  .withIndex("by_author", (q) => q.eq("authorId", userId))
  .collect();
```

### Avoid Unbounded Queries

```typescript
// ❌ Bad: Could return millions of rows
const allPosts = await ctx.db.query("posts").collect();

// ✅ Good: Limit results
const recentPosts = await ctx.db
  .query("posts")
  .order("desc")
  .take(100);

// ✅ Good: Use pagination
const page = await ctx.db
  .query("posts")
  .order("desc")
  .paginate(paginationOpts);
```

### Batch Database Operations

```typescript
// ❌ Bad: Sequential queries
for (const userId of userIds) {
  const user = await ctx.db.get(userId);
  results.push(user);
}

// ✅ Good: Parallel queries
const users = await Promise.all(
  userIds.map((id) => ctx.db.get(id))
);
```

### Avoid Sequential runMutation in Actions

```typescript
// ❌ Bad: Each mutation is a separate transaction
export const processItems = action({
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.runMutation(internal.items.process, { item });
    }
  },
});

// ✅ Good: Single mutation handles all items
export const processItems = action({
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.items.processAll, {
      items: args.items,
    });
  },
});
```

### Denormalize for Read Performance

```typescript
// Schema with denormalized count
export default defineSchema({
  users: defineTable({
    name: v.string(),
    postCount: v.number(),  // Denormalized
  }),
  
  posts: defineTable({
    authorId: v.id("users"),
    title: v.string(),
  }),
});

// Update count when creating post
export const createPost = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    await ctx.db.insert("posts", {
      authorId: user._id,
      title: args.title,
    });

    // Update denormalized count
    await ctx.db.patch(user._id, {
      postCount: user.postCount + 1,
    });
  },
});
```

---

## Code Organization

### Model Layer Pattern

```
convex/
├── _generated/
├── schema.ts
├── auth.ts
├── http.ts
├── crons.ts
│
├── model/                 # Business logic
│   ├── users.ts
│   ├── posts.ts
│   └── comments.ts
│
├── functions/             # Thin wrappers
│   ├── users.ts
│   ├── posts.ts
│   └── comments.ts
│
└── lib/                   # Utilities
    ├── auth.ts
    ├── validation.ts
    └── helpers.ts
```

### Model Layer

```typescript
// convex/model/posts.ts
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function getPost(ctx: QueryCtx, id: Id<"posts">) {
  return await ctx.db.get(id);
}

export async function createPost(
  ctx: MutationCtx,
  authorId: Id<"users">,
  title: string,
  body: string
) {
  return await ctx.db.insert("posts", {
    authorId,
    title,
    body,
    createdAt: Date.now(),
  });
}

export async function updatePost(
  ctx: MutationCtx,
  id: Id<"posts">,
  updates: { title?: string; body?: string }
) {
  return await ctx.db.patch(id, updates);
}
```

### Function Layer

```typescript
// convex/functions/posts.ts
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import * as Posts from "../model/posts";
import { requireAuth } from "../lib/auth";

export const get = query({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    return await Posts.getPost(ctx, args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    return await Posts.createPost(ctx, user._id, args.title, args.body);
  },
});
```

### Custom Function Builders

```typescript
// convex/lib/customFunctions.ts
import { customQuery, customMutation } from "convex-helpers/server/customFunctions";
import { query, mutation } from "../_generated/server";

// Add authentication to all functions
export const authQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    
    return { ctx: { ...ctx, user }, args: {} };
  },
});

export const authMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    
    return { ctx: { ...ctx, user }, args: {} };
  },
});

// Usage
export const myData = authQuery({
  args: {},
  handler: async (ctx) => {
    // ctx.user is available and typed
    return await ctx.db
      .query("data")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();
  },
});
```

---

## Testing

### Unit Testing Functions

```typescript
// convex/posts.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("create and list posts", async () => {
  const t = convexTest(schema);

  // Create a post
  const postId = await t.mutation(api.posts.create, {
    title: "Test Post",
    body: "Test body",
  });

  expect(postId).toBeDefined();

  // List posts
  const posts = await t.query(api.posts.list, {});
  expect(posts).toHaveLength(1);
  expect(posts[0].title).toBe("Test Post");
});

test("requires authentication", async () => {
  const t = convexTest(schema);

  // Should throw when not authenticated
  await expect(
    t.mutation(api.posts.create, { title: "Test", body: "Test" })
  ).rejects.toThrow("Unauthenticated");
});

test("with authenticated user", async () => {
  const t = convexTest(schema);

  // Set up authenticated context
  const asUser = t.withIdentity({
    tokenIdentifier: "user123",
    email: "test@example.com",
  });

  const postId = await asUser.mutation(api.posts.create, {
    title: "Test Post",
    body: "Test body",
  });

  expect(postId).toBeDefined();
});
```

### Testing with Data

```typescript
test("pagination works correctly", async () => {
  const t = convexTest(schema);

  // Create 25 posts
  for (let i = 0; i < 25; i++) {
    await t.mutation(api.posts.create, {
      title: `Post ${i}`,
      body: "Body",
    });
  }

  // Test first page
  const page1 = await t.query(api.posts.list, {
    paginationOpts: { numItems: 10, cursor: null },
  });

  expect(page1.page).toHaveLength(10);
  expect(page1.isDone).toBe(false);

  // Test second page
  const page2 = await t.query(api.posts.list, {
    paginationOpts: { numItems: 10, cursor: page1.continueCursor },
  });

  expect(page2.page).toHaveLength(10);
});
```

---

## Deployment

### Environment Configuration

```bash
# Development
npx convex dev

# Preview deployments
npx convex deploy --preview

# Production deployment
npx convex deploy
```

### Environment Variables

```bash
# Set production environment variables
npx convex env set OPENAI_API_KEY sk-...
npx convex env set STRIPE_SECRET_KEY sk_live_...

# List environment variables
npx convex env list

# Remove environment variable
npx convex env unset OLD_VAR
```

### Deployment Best Practices

```typescript
// 1. Schema migrations should be backward compatible
// ❌ Bad: Removing a field immediately
// ✅ Good: Mark as optional first, then remove later

// 2. Use preview deployments for testing
// npx convex deploy --preview

// 3. Monitor deployments in dashboard
// https://dashboard.convex.dev

// 4. Use function versioning for breaking changes
export const listV2 = query({
  args: { includeDeleted: v.boolean() },
  handler: async (ctx, args) => {
    // New implementation
  },
});

// 5. Gradually migrate clients to new functions
```

### Self-Hosting (Beta)

```bash
# Clone Convex backend
git clone https://github.com/get-convex/convex-backend

# Start with Docker
docker-compose up

# Point your app to self-hosted instance
CONVEX_URL=http://localhost:3210
```

### Backup and Export

```bash
# Export all data
npx convex export --path ./backup

# Export specific tables
npx convex export --table users --path ./users-backup.json

# Import data
npx convex import --table users ./users-backup.json
```
