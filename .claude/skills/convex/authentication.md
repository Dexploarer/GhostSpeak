# Authentication

## Table of Contents
- [Authentication Overview](#authentication-overview)
- [Convex Auth](#convex-auth)
- [Clerk Integration](#clerk-integration)
- [Auth0 Integration](#auth0-integration)
- [Custom JWT Providers](#custom-jwt-providers)
- [Backend Authentication](#backend-authentication)
- [Authorization Patterns](#authorization-patterns)

---

## Authentication Overview

### How Convex Auth Works

1. User authenticates with a provider (Convex Auth, Clerk, Auth0, etc.)
2. Provider issues a JWT token
3. Convex client sends token with each request
4. Backend validates token and provides `ctx.auth.getUserIdentity()`

### Identity Object

```typescript
// ctx.auth.getUserIdentity() returns:
interface UserIdentity {
  // Always present
  tokenIdentifier: string;  // Unique identifier for this token
  issuer: string;           // Token issuer URL
  subject: string;          // User ID from the auth provider

  // Optional claims (depend on provider)
  name?: string;
  givenName?: string;
  familyName?: string;
  nickname?: string;
  preferredUsername?: string;
  profileUrl?: string;
  pictureUrl?: string;
  email?: string;
  emailVerified?: boolean;
  gender?: string;
  birthday?: string;
  timezone?: string;
  locale?: string;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  address?: string;
  updatedAt?: string;
}
```

---

## Convex Auth

### Installation

```bash
npm install @convex-dev/auth
npx convex auth
```

### Configuration

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { Resend } from "@convex-dev/auth/providers/Resend";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    // OAuth providers
    GitHub,
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),

    // Email/password
    Password,

    // Magic link via Resend
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: "noreply@yourapp.com",
    }),
  ],
});
```

### Environment Variables

```bash
# .env.local
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
AUTH_RESEND_KEY=your_resend_api_key
```

### Schema Setup

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  // Your app tables
  posts: defineTable({
    authorId: v.id("users"),
    title: v.string(),
    body: v.string(),
  }),
});
```

### React Provider

```typescript
// app/ConvexClientProvider.tsx
"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
```

### Sign In UI

```typescript
// components/SignIn.tsx
"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OAuth sign in
  const handleGitHub = () => {
    signIn("github");
  };

  // Email/password sign in
  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    signIn("password", { email, password });
  };

  // Magic link sign in
  const handleMagicLink = (e: React.FormEvent) => {
    e.preventDefault();
    signIn("resend", { email });
  };

  return (
    <div>
      <button onClick={handleGitHub}>Sign in with GitHub</button>

      <form onSubmit={handlePassword}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Sign in with Password</button>
      </form>

      <form onSubmit={handleMagicLink}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <button type="submit">Send Magic Link</button>
      </form>
    </div>
  );
}
```

### Sign Out

```typescript
"use client";

import { useAuthActions } from "@convex-dev/auth/react";

export function SignOut() {
  const { signOut } = useAuthActions();

  return (
    <button onClick={() => signOut()}>
      Sign Out
    </button>
  );
}
```

### Conditional Rendering

```typescript
"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignIn } from "./SignIn";
import { Dashboard } from "./Dashboard";

export function App() {
  return (
    <>
      <AuthLoading>
        <div>Loading...</div>
      </AuthLoading>

      <Unauthenticated>
        <SignIn />
      </Unauthenticated>

      <Authenticated>
        <Dashboard />
      </Authenticated>
    </>
  );
}
```

### Getting Current User

```typescript
// convex/users.ts
import { query } from "./_generated/server";
import { auth } from "./auth";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db.get(userId);
  },
});

export const viewerWithSession = query({
  args: {},
  handler: async (ctx) => {
    const sessionId = await auth.getSessionId(ctx);
    if (!sessionId) return null;

    const session = await ctx.db.get(sessionId);
    const userId = session?.userId;
    if (!userId) return null;

    return await ctx.db.get(userId);
  },
});
```

---

## Clerk Integration

### Installation

```bash
npm install @clerk/nextjs @clerk/clerk-react
```

### Clerk Dashboard Setup

1. Create JWT Template named "convex"
2. Copy the Issuer URL

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### Convex Auth Config

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: "https://your-clerk-domain.clerk.accounts.dev",  // Issuer URL
      applicationID: "convex",  // JWT template name
    },
  ],
};
```

### Provider Setup

```typescript
// app/ConvexClientProvider.tsx
"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function ConvexClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexClerkProvider>{children}</ConvexClerkProvider>
    </ClerkProvider>
  );
}
```

### Protected Routes

```typescript
// app/dashboard/page.tsx
"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Dashboard() {
  return (
    <>
      <Unauthenticated>
        <SignInButton mode="modal" />
      </Unauthenticated>

      <Authenticated>
        <DashboardContent />
        <UserButton />
      </Authenticated>
    </>
  );
}

function DashboardContent() {
  const user = useQuery(api.users.viewer, {});
  
  if (!user) return <div>Loading...</div>;
  
  return <div>Welcome, {user.name}!</div>;
}
```

### Syncing User Data

```typescript
// convex/users.ts
import { mutation, query } from "./_generated/server";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => 
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user !== null) {
      // Update existing user
      if (user.name !== identity.name || user.email !== identity.email) {
        await ctx.db.patch(user._id, {
          name: identity.name,
          email: identity.email,
        });
      }
      return user._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
    });
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => 
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});
```

---

## Auth0 Integration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_client_id
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### Auth Config

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: "https://your-tenant.auth0.com",
      applicationID: "your_client_id",
    },
  ],
};
```

### Provider Setup

```typescript
// app/ConvexClientProvider.tsx
"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import { ConvexProviderWithAuth0 } from "convex/react-auth0";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" 
          ? window.location.origin 
          : undefined,
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <ConvexProviderWithAuth0 client={convex}>
        {children}
      </ConvexProviderWithAuth0>
    </Auth0Provider>
  );
}
```

---

## Custom JWT Providers

### Auth Config

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      // OIDC issuer domain
      domain: "https://accounts.google.com",
      
      // Application/audience identifier
      applicationID: "your-app-id",
    },
    {
      // Another provider
      domain: "https://login.microsoftonline.com/{tenant}/v2.0",
      applicationID: "your-azure-app-id",
    },
  ],
};
```

### Manual Token Setting

```typescript
"use client";

import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Set token manually
async function authenticate() {
  const token = await getTokenFromYourAuthProvider();
  convex.setAuth(async () => token);
}

// Clear auth
function logout() {
  convex.clearAuth();
}
```

---

## Backend Authentication

### Checking Authentication in Functions

```typescript
// convex/posts.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Public query (no auth required)
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("posts").collect();
  },
});

// Authenticated query
export const myPosts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    return await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => 
        q.eq("authorId", identity.subject)
      )
      .collect();
  },
});

// Authenticated mutation
export const create = mutation({
  args: { title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    return await ctx.db.insert("posts", {
      authorId: identity.subject,
      title: args.title,
      body: args.body,
    });
  },
});
```

### HTTP Action Authentication

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/api/posts",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Get token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Validate and use the identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response("Invalid token", { status: 401 });
    }

    const posts = await ctx.runQuery(api.posts.list, {});
    return Response.json(posts);
  }),
});

export default http;
```

---

## Authorization Patterns

### Role-Based Access Control (RBAC)

```typescript
// convex/schema.ts
export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("moderator"),
      v.literal("user")
    ),
  }).index("by_token", ["tokenIdentifier"]),
});

// convex/lib/auth.ts
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => 
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

export async function requireModerator(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user || !["admin", "moderator"].includes(user.role)) {
    throw new Error("Moderator access required");
  }
  return user;
}

// Usage in functions
export const adminOnly = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    // Only admins can reach here
  },
});
```

### Row-Level Security (RLS)

```typescript
// convex/posts.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./lib/auth";

export const get = query({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) return null;

    // Public posts are visible to everyone
    if (post.visibility === "public") {
      return post;
    }

    // Private posts require auth
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    // Only owner or admin can see private posts
    if (post.authorId === user._id || user.role === "admin") {
      return post;
    }

    return null;
  },
});

export const update = mutation({
  args: { 
    id: v.id("posts"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthenticated");

    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Post not found");

    // Only owner or admin can update
    if (post.authorId !== user._id && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});
```

### Team-Based Access

```typescript
// convex/schema.ts
export default defineSchema({
  teams: defineTable({
    name: v.string(),
  }),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_user", ["teamId", "userId"]),

  projects: defineTable({
    teamId: v.id("teams"),
    name: v.string(),
  }).index("by_team", ["teamId"]),
});

// convex/lib/teams.ts
export async function requireTeamMember(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Unauthenticated");

  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_user", (q) =>
      q.eq("teamId", teamId).eq("userId", user._id)
    )
    .unique();

  if (!membership) {
    throw new Error("Not a team member");
  }

  return { user, membership };
}

export async function requireTeamOwner(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
) {
  const { user, membership } = await requireTeamMember(ctx, teamId);

  if (membership.role !== "owner") {
    throw new Error("Team owner required");
  }

  return { user, membership };
}
```
