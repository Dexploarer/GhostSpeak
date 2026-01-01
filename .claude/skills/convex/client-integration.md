# Client Integration

## Table of Contents
- [React Setup](#react-setup)
- [React Hooks](#react-hooks)
- [Next.js Integration](#nextjs-integration)
- [TanStack Query](#tanstack-query)
- [Optimistic Updates](#optimistic-updates)
- [Error Handling](#error-handling)
- [Loading States](#loading-states)

---

## React Setup

### Provider Setup

```typescript
// app/ConvexClientProvider.tsx
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

```typescript
// app/layout.tsx
import { ConvexClientProvider } from "./ConvexClientProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-project-123.convex.cloud

# For server-side usage
CONVEX_URL=https://your-project-123.convex.cloud
```

---

## React Hooks

### useQuery

```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function MessageList({ channel }: { channel: string }) {
  // Reactive query - updates automatically when data changes
  const messages = useQuery(api.messages.list, { channel });

  // Returns undefined while loading
  if (messages === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <ul>
      {messages.map((msg) => (
        <li key={msg._id}>{msg.body}</li>
      ))}
    </ul>
  );
}
```

### useQuery with Skip

```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function UserProfile({ userId }: { userId: string | null }) {
  // Skip query when userId is null
  const user = useQuery(
    api.users.get,
    userId ? { id: userId } : "skip"
  );

  if (userId === null) {
    return <div>No user selected</div>;
  }

  if (user === undefined) {
    return <div>Loading...</div>;
  }

  return <div>{user.name}</div>;
}
```

### useMutation

```typescript
"use client";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

export function SendMessage({ channel }: { channel: string }) {
  const [body, setBody] = useState("");
  const sendMessage = useMutation(api.messages.send);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await sendMessage({ channel, body });
      setBody("");  // Clear input on success
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type a message..."
      />
      <button type="submit">Send</button>
    </form>
  );
}
```

### useAction

```typescript
"use client";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

export function AIChat() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  
  const generateResponse = useAction(api.ai.generate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await generateResponse({ prompt });
      setResponse(result);
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Ask AI"}
        </button>
      </form>
      {response && <div>{response}</div>}
    </div>
  );
}
```

### usePaginatedQuery

```typescript
"use client";
import { usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function InfinitePostList() {
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

      <div>
        {status === "LoadingFirstPage" && <Spinner />}
        
        {status === "CanLoadMore" && (
          <button onClick={() => loadMore(10)}>
            Load More
          </button>
        )}
        
        {status === "LoadingMore" && <Spinner />}
        
        {status === "Exhausted" && (
          <p>You've reached the end!</p>
        )}
      </div>
    </div>
  );
}
```

### useQueries (Multiple Queries)

```typescript
"use client";
import { useQueries } from "convex/react";
import { api } from "../convex/_generated/api";

export function Dashboard({ userIds }: { userIds: string[] }) {
  // Load multiple queries at once
  const queries = useQueries(
    Object.fromEntries(
      userIds.map((id) => [
        id,
        { query: api.users.get, args: { id } }
      ])
    )
  );

  return (
    <div>
      {userIds.map((id) => {
        const user = queries[id];
        if (user === undefined) return <div key={id}>Loading...</div>;
        return <UserCard key={id} user={user} />;
      })}
    </div>
  );
}
```

### useConvex (Direct Client Access)

```typescript
"use client";
import { useConvex } from "convex/react";
import { api } from "../convex/_generated/api";

export function SearchButton() {
  const convex = useConvex();

  const handleSearch = async () => {
    // One-off query (not reactive)
    const results = await convex.query(api.search.find, { 
      query: "hello" 
    });
    console.log(results);
  };

  return <button onClick={handleSearch}>Search</button>;
}
```

---

## Next.js Integration

### App Router Setup

```typescript
// app/ConvexClientProvider.tsx
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

### Server Components with preloadQuery

```typescript
// app/posts/page.tsx (Server Component)
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { PostList } from "./PostList";

export default async function PostsPage() {
  // Preload data on server
  const preloadedPosts = await preloadQuery(api.posts.list, {});

  return <PostList preloadedPosts={preloadedPosts} />;
}
```

```typescript
// app/posts/PostList.tsx (Client Component)
"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function PostList({
  preloadedPosts,
}: {
  preloadedPosts: Preloaded<typeof api.posts.list>;
}) {
  // Hydrates with preloaded data, then subscribes for updates
  const posts = usePreloadedQuery(preloadedPosts);

  return (
    <ul>
      {posts.map((post) => (
        <li key={post._id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Server-Only Queries with fetchQuery

```typescript
// app/posts/[id]/page.tsx
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export default async function PostPage({
  params,
}: {
  params: { id: string };
}) {
  // One-time fetch (not reactive)
  const post = await fetchQuery(api.posts.get, { id: params.id });

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  );
}
```

### Server Actions with fetchMutation

```typescript
// app/posts/actions.ts
"use server";

import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const body = formData.get("body") as string;

  await fetchMutation(api.posts.create, { title, body });

  revalidatePath("/posts");
}
```

```typescript
// app/posts/new/page.tsx
import { createPost } from "../actions";

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Title" required />
      <textarea name="body" placeholder="Body" required />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

### Route Handlers

```typescript
// app/api/posts/route.ts
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const posts = await fetchQuery(api.posts.list, {});
  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const { title, body } = await request.json();
  
  const id = await fetchMutation(api.posts.create, { title, body });
  
  return NextResponse.json({ id }, { status: 201 });
}
```

### Authenticated Server Rendering

```typescript
// app/dashboard/page.tsx
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";
import { Dashboard } from "./Dashboard";

export default async function DashboardPage() {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });

  const preloadedData = await preloadQuery(
    api.dashboard.getData,
    {},
    { token }
  );

  return <Dashboard preloadedData={preloadedData} />;
}
```

---

## TanStack Query

### Setup

```typescript
// app/providers.tsx
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});
convexQueryClient.connect(queryClient);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ConvexProvider>
  );
}
```

### TanStack useQuery

```typescript
"use client";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../convex/_generated/api";

export function PostList() {
  const { data, isPending, error } = useQuery(
    convexQuery(api.posts.list, {})
  );

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((post) => (
        <li key={post._id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### TanStack useMutation

```typescript
"use client";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../convex/_generated/api";

export function CreatePost() {
  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.posts.create),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    mutate({
      title: formData.get("title") as string,
      body: formData.get("body") as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <textarea name="body" required />
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
```

---

## Optimistic Updates

### Basic Optimistic Update

```typescript
"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function TodoList() {
  const todos = useQuery(api.todos.list, {});
  const toggleTodo = useMutation(api.todos.toggle).withOptimisticUpdate(
    (localStore, args) => {
      const currentTodos = localStore.getQuery(api.todos.list, {});
      if (currentTodos === undefined) return;

      localStore.setQuery(
        api.todos.list,
        {},
        currentTodos.map((todo) =>
          todo._id === args.id
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      );
    }
  );

  if (todos === undefined) return <div>Loading...</div>;

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo._id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo({ id: todo._id })}
          />
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

### Optimistic Create

```typescript
"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

export function MessageInput({ channel }: { channel: string }) {
  const [text, setText] = useState("");
  
  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate(
    (localStore, args) => {
      const currentMessages = localStore.getQuery(api.messages.list, { 
        channel: args.channel 
      });
      if (currentMessages === undefined) return;

      // Add optimistic message
      const optimisticMessage = {
        _id: crypto.randomUUID() as any,  // Temporary ID
        _creationTime: Date.now(),
        body: args.body,
        channel: args.channel,
        authorId: "optimistic" as any,
        pending: true,  // Mark as pending
      };

      localStore.setQuery(
        api.messages.list,
        { channel: args.channel },
        [...currentMessages, optimisticMessage]
      );
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage({ channel, body: text });
    setText("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit">Send</button>
    </form>
  );
}
```

---

## Error Handling

### Try-Catch Pattern

```typescript
"use client";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

export function CreatePost() {
  const [error, setError] = useState<string | null>(null);
  const createPost = useMutation(api.posts.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createPost({ title: "Hello", body: "World" });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <button type="submit">Create</button>
    </form>
  );
}
```

### Error Boundary

```typescript
"use client";
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ConvexClientProvider>
        <MainContent />
      </ConvexClientProvider>
    </ErrorBoundary>
  );
}
```

---

## Loading States

### Component Loading Pattern

```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function UserProfile({ userId }: { userId: string }) {
  const user = useQuery(api.users.get, { id: userId });

  // Loading state
  if (user === undefined) {
    return <UserProfileSkeleton />;
  }

  // Not found state
  if (user === null) {
    return <div>User not found</div>;
  }

  // Loaded state
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

function UserProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-48" />
    </div>
  );
}
```

### Suspense Integration

```typescript
// Using React Suspense with preloadQuery
import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export default async function Page() {
  const preloaded = await preloadQuery(api.posts.list, {});

  return (
    <Suspense fallback={<PostListSkeleton />}>
      <PostList preloaded={preloaded} />
    </Suspense>
  );
}
```

### Multi-Query Loading

```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function Dashboard() {
  const user = useQuery(api.users.me, {});
  const posts = useQuery(api.posts.list, {});
  const stats = useQuery(api.stats.get, {});

  // Check if any query is loading
  const isLoading = 
    user === undefined || 
    posts === undefined || 
    stats === undefined;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div>
      <UserHeader user={user} />
      <PostList posts={posts} />
      <StatsPanel stats={stats} />
    </div>
  );
}
```
