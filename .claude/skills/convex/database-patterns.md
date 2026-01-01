# Database Patterns

## Table of Contents
- [CRUD Operations](#crud-operations)
- [Querying Data](#querying-data)
- [Indexes](#indexes)
- [Pagination](#pagination)
- [Relationships](#relationships)
- [Full-Text Search](#full-text-search)
- [Vector Search](#vector-search)
- [Transactions](#transactions)

---

## CRUD Operations

### Create (Insert)

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Insert returns the new document's ID
    const id = await ctx.db.insert("posts", {
      title: args.title,
      body: args.body,
      tags: args.tags,
      views: 0,
      published: false,
    });
    return id;
  },
});
```

### Read (Get / Query)

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// Get single document by ID
export const get = query({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    return post;  // Returns document or null
  },
});

// Query multiple documents
export const list = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    return posts;
  },
});
```

### Update (Patch / Replace)

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Patch: Update specific fields
export const update = mutation({
  args: {
    id: v.id("posts"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Only update provided fields
    const patch: Record<string, any> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.body !== undefined) patch.body = updates.body;
    
    await ctx.db.patch(id, patch);
  },
});

// Replace: Replace entire document
export const replace = mutation({
  args: {
    id: v.id("posts"),
    title: v.string(),
    body: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...doc } = args;
    
    // Replaces all fields except _id and _creationTime
    await ctx.db.replace(id, {
      ...doc,
      views: 0,
      published: false,
    });
  },
});

// Increment a counter
export const incrementViews = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Post not found");
    
    await ctx.db.patch(args.id, {
      views: post.views + 1,
    });
  },
});
```

### Delete

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const remove = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    // Check if document exists
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Post not found");
    
    await ctx.db.delete(args.id);
  },
});

// Soft delete pattern
export const softDelete = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
    });
  },
});
```

---

## Querying Data

### Query Chain Methods

```typescript
// Full query chain
const results = await ctx.db
  .query("messages")                    // Start query on table
  .withIndex("by_channel", (q) =>       // Use index
    q.eq("channel", "general")
  )
  .filter((q) =>                        // Additional filter
    q.gt(q.field("_creationTime"), cutoff)
  )
  .order("desc")                        // Order: "asc" or "desc"
  .take(10);                            // Limit results
```

### Result Methods

```typescript
// Collect all matching documents
const all = await ctx.db.query("posts").collect();

// Get first matching document
const first = await ctx.db.query("posts").first();

// Get exactly one (throws if 0 or 2+)
const unique = await ctx.db.query("posts")
  .withIndex("by_slug", (q) => q.eq("slug", "my-post"))
  .unique();

// Take N documents
const topTen = await ctx.db.query("posts")
  .order("desc")
  .take(10);

// Paginate
const page = await ctx.db.query("posts")
  .order("desc")
  .paginate(paginationOpts);
```

### Filter Operators

```typescript
// Comparison operators
.filter((q) => q.eq(q.field("status"), "active"))      // ==
.filter((q) => q.neq(q.field("status"), "deleted"))    // !=
.filter((q) => q.gt(q.field("count"), 10))             // >
.filter((q) => q.gte(q.field("count"), 10))            // >=
.filter((q) => q.lt(q.field("count"), 100))            // <
.filter((q) => q.lte(q.field("count"), 100))           // <=

// Logical operators
.filter((q) => q.and(
  q.eq(q.field("status"), "active"),
  q.gt(q.field("count"), 10)
))

.filter((q) => q.or(
  q.eq(q.field("role"), "admin"),
  q.eq(q.field("role"), "moderator")
))

.filter((q) => q.not(
  q.eq(q.field("status"), "deleted")
))

// Arithmetic
.filter((q) => q.gt(
  q.mul(q.field("width"), q.field("height")),
  1000
))

// Field access
q.field("name")                      // Top-level field
q.field("address.city")              // Nested field (doesn't work in filter)
```

### Async Iteration

```typescript
// Iterate without loading all into memory
export const findFirst = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    for await (const post of ctx.db.query("posts")) {
      if (post.tags.includes(args.tag)) {
        return post;  // Return first match
      }
    }
    return null;
  },
});
```

### TypeScript Filtering (convex-helpers)

```typescript
import { filter } from "convex-helpers/server/filter";

export const postsWithTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    // More expressive than .filter()
    return await filter(
      ctx.db.query("posts"),
      (post) => post.tags.includes(args.tag)
    ).collect();
  },
});

// Combine with index
export const userPostsWithTag = query({
  args: { userId: v.id("users"), tag: v.string() },
  handler: async (ctx, args) => {
    return await filter(
      ctx.db.query("posts")
        .withIndex("by_author", (q) => q.eq("authorId", args.userId)),
      (post) => post.tags.includes(args.tag)
    ).collect();
  },
});
```

---

## Indexes

### Index Definition

```typescript
// convex/schema.ts
export default defineSchema({
  messages: defineTable({
    channel: v.string(),
    authorId: v.id("users"),
    body: v.string(),
    pinned: v.boolean(),
  })
    // Single field index
    .index("by_channel", ["channel"])
    
    // Compound index
    .index("by_channel_author", ["channel", "authorId"])
    
    // Index for boolean + ordering
    .index("by_pinned", ["pinned"]),
});
```

### Using Indexes

```typescript
// Equality condition
const messages = await ctx.db
  .query("messages")
  .withIndex("by_channel", (q) => q.eq("channel", "general"))
  .collect();

// Compound index with multiple conditions
const userMessages = await ctx.db
  .query("messages")
  .withIndex("by_channel_author", (q) => 
    q.eq("channel", "general").eq("authorId", userId)
  )
  .collect();

// Range queries
const recentMessages = await ctx.db
  .query("messages")
  .withIndex("by_channel", (q) =>
    q.eq("channel", "general")
     .gt("_creationTime", Date.now() - 86400000)  // Last 24 hours
  )
  .collect();

// Range with bounds
const messagesInRange = await ctx.db
  .query("messages")
  .withIndex("by_channel", (q) =>
    q.eq("channel", "general")
     .gte("_creationTime", startTime)
     .lt("_creationTime", endTime)
  )
  .collect();
```

### Index Range Operators

```typescript
// Must be used in order: eq -> gt/gte -> lt/lte
.withIndex("by_channel", (q) =>
  q
    .eq("channel", "general")      // First: equality on channel
    .gt("_creationTime", start)    // Then: lower bound
    .lt("_creationTime", end)      // Then: upper bound
)

// Available operators
q.eq("field", value)    // Equality
q.gt("field", value)    // Greater than
q.gte("field", value)   // Greater than or equal
q.lt("field", value)    // Less than
q.lte("field", value)   // Less than or equal
```

### Index Best Practices

```typescript
// ❌ Bad: Full table scan
const posts = await ctx.db
  .query("posts")
  .filter((q) => q.eq(q.field("authorId"), userId))
  .collect();

// ✅ Good: Use index
const posts = await ctx.db
  .query("posts")
  .withIndex("by_author", (q) => q.eq("authorId", userId))
  .collect();

// ❌ Bad: Redundant indexes
.index("by_channel", ["channel"])
.index("by_channel_time", ["channel", "_creationTime"])  // Redundant!

// ✅ Good: Single compound index handles both cases
.index("by_channel", ["channel"])  // _creationTime is implicit

// ❌ Bad: Filter after unbounded query
const active = await ctx.db
  .query("users")
  .filter((q) => q.eq(q.field("status"), "active"))
  .collect();

// ✅ Good: Index on status
const active = await ctx.db
  .query("users")
  .withIndex("by_status", (q) => q.eq("status", "active"))
  .collect();
```

---

## Pagination

### Backend Pagination

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// With additional filters
export const listByChannel = query({
  args: {
    channel: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Transform results
export const listWithAuthor = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("posts")
      .order("desc")
      .paginate(args.paginationOpts);

    // Transform the page
    const postsWithAuthors = await Promise.all(
      result.page.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        return { ...post, author };
      })
    );

    return {
      ...result,
      page: postsWithAuthors,
    };
  },
});
```

### React Pagination Hook

```typescript
"use client";
import { usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function PostList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.list,
    {},
    { initialNumItems: 10 }
  );

  return (
    <div>
      {results.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}

      {status === "CanLoadMore" && (
        <button onClick={() => loadMore(10)}>
          Load More
        </button>
      )}

      {status === "LoadingMore" && <div>Loading...</div>}

      {status === "Exhausted" && <div>No more posts</div>}
    </div>
  );
}
```

### Pagination Result Shape

```typescript
interface PaginationResult<T> {
  page: T[];                    // Current page of documents
  isDone: boolean;              // True if no more results
  continueCursor: string;       // Cursor for next page
}

// Status values in usePaginatedQuery
type PaginationStatus = 
  | "LoadingFirstPage"    // Initial load
  | "CanLoadMore"         // More results available
  | "LoadingMore"         // Loading next page
  | "Exhausted";          // No more results
```

---

## Relationships

### One-to-One

```typescript
// Schema
export default defineSchema({
  users: defineTable({
    name: v.string(),
    profileId: v.id("profiles"),  // Reference to profile
  }),
  
  profiles: defineTable({
    bio: v.string(),
    avatarUrl: v.string(),
  }),
});

// Query with join
export const getUserWithProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    
    const profile = await ctx.db.get(user.profileId);
    return { ...user, profile };
  },
});
```

### One-to-Many

```typescript
// Schema
export default defineSchema({
  users: defineTable({
    name: v.string(),
  }),
  
  posts: defineTable({
    authorId: v.id("users"),
    title: v.string(),
  }).index("by_author", ["authorId"]),
});

// Get user's posts
export const getUserPosts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();
  },
});

// Get post with author
export const getPostWithAuthor = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;
    
    const author = await ctx.db.get(post.authorId);
    return { ...post, author };
  },
});
```

### Many-to-Many

```typescript
// Schema with junction table
export default defineSchema({
  users: defineTable({
    name: v.string(),
  }),
  
  groups: defineTable({
    name: v.string(),
  }),
  
  // Junction table
  userGroups: defineTable({
    userId: v.id("users"),
    groupId: v.id("groups"),
    role: v.string(),
    joinedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_group", ["groupId"])
    .index("by_user_group", ["userId", "groupId"]),
});

// Get user's groups
export const getUserGroups = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("userGroups")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (m) => {
        const group = await ctx.db.get(m.groupId);
        return { ...group, role: m.role, joinedAt: m.joinedAt };
      })
    );

    return groups;
  },
});

// Get group members
export const getGroupMembers = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("userGroups")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return { ...user, role: m.role, joinedAt: m.joinedAt };
      })
    );

    return members;
  },
});

// Add user to group
export const addToGroup = mutation({
  args: {
    userId: v.id("users"),
    groupId: v.id("groups"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already a member
    const existing = await ctx.db
      .query("userGroups")
      .withIndex("by_user_group", (q) =>
        q.eq("userId", args.userId).eq("groupId", args.groupId)
      )
      .unique();

    if (existing) {
      throw new Error("Already a member");
    }

    return await ctx.db.insert("userGroups", {
      userId: args.userId,
      groupId: args.groupId,
      role: args.role,
      joinedAt: Date.now(),
    });
  },
});
```

---

## Full-Text Search

### Search Index Definition

```typescript
// convex/schema.ts
export default defineSchema({
  articles: defineTable({
    title: v.string(),
    body: v.string(),
    category: v.string(),
    authorId: v.id("users"),
    published: v.boolean(),
  })
    .searchIndex("search_content", {
      searchField: "body",
      filterFields: ["category", "authorId", "published"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["published"],
    }),
});
```

### Search Queries

```typescript
// Basic search
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("articles")
      .withSearchIndex("search_content", (q) =>
        q.search("body", args.query)
      )
      .take(20);
  },
});

// Search with filters
export const searchInCategory = query({
  args: { 
    query: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("articles")
      .withSearchIndex("search_content", (q) =>
        q.search("body", args.query)
         .eq("category", args.category)
         .eq("published", true)
      )
      .take(20);
  },
});

// Search with post-filtering
export const searchWithDetails = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .withSearchIndex("search_content", (q) =>
        q.search("body", args.query)
         .eq("published", true)
      )
      .filter((q) => 
        q.gt(q.field("_creationTime"), Date.now() - 86400000 * 30)
      )
      .take(20);

    // Add author details
    return Promise.all(
      articles.map(async (article) => ({
        ...article,
        author: await ctx.db.get(article.authorId),
      }))
    );
  },
});
```

---

## Vector Search

### Vector Index Definition

```typescript
// convex/schema.ts
export default defineSchema({
  documents: defineTable({
    content: v.string(),
    embedding: v.array(v.float64()),
    category: v.string(),
    sourceUrl: v.optional(v.string()),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,  // OpenAI text-embedding-ada-002
      filterFields: ["category"],
    }),
});
```

### Vector Search (Actions Only)

```typescript
// convex/search.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const semanticSearch = action({
  args: { 
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for query
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: args.query,
      }),
    });
    const { data } = await response.json();
    const embedding = data[0].embedding;

    // Search vector index
    const results = await ctx.vectorSearch("documents", "by_embedding", {
      vector: embedding,
      limit: args.limit ?? 10,
      filter: args.category 
        ? (q) => q.eq("category", args.category)
        : undefined,
    });

    // Fetch full documents
    const documents = await Promise.all(
      results.map(async (result) => {
        const doc = await ctx.runQuery(api.documents.get, { id: result._id });
        return { ...doc, score: result._score };
      })
    );

    return documents;
  },
});
```

### Storing Embeddings

```typescript
export const addDocument = action({
  args: {
    content: v.string(),
    category: v.string(),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate embedding
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: args.content,
      }),
    });
    const { data } = await response.json();
    const embedding = data[0].embedding;

    // Store document with embedding
    await ctx.runMutation(internal.documents.insert, {
      content: args.content,
      embedding,
      category: args.category,
      sourceUrl: args.sourceUrl,
    });
  },
});
```

---

## Transactions

### Automatic Transactions

```typescript
// Every mutation is automatically a transaction
export const transfer = mutation({
  args: {
    fromId: v.id("accounts"),
    toId: v.id("accounts"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const from = await ctx.db.get(args.fromId);
    const to = await ctx.db.get(args.toId);

    if (!from || !to) throw new Error("Account not found");
    if (from.balance < args.amount) throw new Error("Insufficient funds");

    // Both updates happen atomically
    await ctx.db.patch(args.fromId, {
      balance: from.balance - args.amount,
    });
    await ctx.db.patch(args.toId, {
      balance: to.balance + args.amount,
    });

    // If either fails, both are rolled back
  },
});
```

### Optimistic Concurrency Control

```typescript
// Convex automatically handles conflicts
export const incrementCounter = mutation({
  args: { id: v.id("counters") },
  handler: async (ctx, args) => {
    const counter = await ctx.db.get(args.id);
    if (!counter) throw new Error("Counter not found");

    // If another mutation modified this document,
    // Convex will retry this mutation automatically
    await ctx.db.patch(args.id, {
      value: counter.value + 1,
    });
  },
});
```

### Read-Write Isolation

```typescript
// Reads within a mutation see a consistent snapshot
export const complexOperation = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // All reads see the same database state
    const user = await ctx.db.get(args.userId);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();

    // Even if other mutations run concurrently,
    // this mutation sees a consistent view
    await ctx.db.patch(args.userId, {
      postCount: posts.length,
      commentCount: comments.length,
    });
  },
});
```
