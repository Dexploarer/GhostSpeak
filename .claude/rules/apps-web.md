---
globs: ["apps/web/**"]
description: Rules and patterns for Next.js 15 web application with Convex backend
---

# Web App Development Rules (apps/web)

## Architecture Context

**Framework**: Next.js 15 (App Router) + React 19 + TailwindCSS 4
**Backend**: Convex (serverless functions + real-time subscriptions)
**State**: React Query (server state) + Zustand (client state)
**3D**: Three.js + React Three Fiber (R3F)
**Animations**: Framer Motion + GSAP
**Port**: 3333 (dev mode)

## Critical Patterns

### 1. Server Components by Default

```typescript
// ✅ DEFAULT: Server Component (async, no useState/useEffect)
export default async function Page() {
  const data = await fetchData(); // Direct data fetching
  return <div>{data}</div>;
}

// ❌ WRONG: Don't add "use client" unless absolutely needed
"use client";
export default function Page() {
  // Only use "use client" for interactivity, hooks, or browser APIs
}
```

### 2. Convex Integration

**Queries** (read data, reactive):
```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function AgentList() {
  const agents = useQuery(api.ghostDiscovery.listAgents);
  if (agents === undefined) return <Loading />;
  return <div>{agents.map(a => ...)}</div>;
}
```

**Mutations** (write data):
```typescript
"use client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function RegisterAgent() {
  const register = useMutation(api.agents.register);

  const handleSubmit = async () => {
    await register({ name, address });
  };

  return <button onClick={handleSubmit}>Register</button>;
}
```

**Actions** (server-side logic, external APIs):
```typescript
// convex/actions.ts
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const indexTransaction = action({
  args: { signature: v.string() },
  handler: async (ctx, { signature }) => {
    // Can call external APIs, other Convex functions
    const data = await fetch(`https://api.helius.com/${signature}`);
    await ctx.runMutation(api.x402Indexer.storeTransaction, { data });
  },
});
```

### 3. Solana Integration

**Always use modern @solana/kit v2**:
```typescript
// ✅ CORRECT
import { createSolanaRpc } from "@solana/rpc";
import { address } from "@solana/addresses";

const rpc = createSolanaRpc(process.env.NEXT_PUBLIC_SOLANA_RPC_URL);
const addr = address(addressString);

// ❌ WRONG - Legacy packages
import { Connection, PublicKey } from "@solana/web3.js"; // ESLint will error
```

**Wallet Integration**:
```typescript
"use client";
import { useWallet } from "@solana/wallet-adapter-react";

export function WalletButton() {
  const { connected, publicKey, connect, disconnect } = useWallet();

  if (!connected) return <button onClick={connect}>Connect</button>;
  return <button onClick={disconnect}>{publicKey?.toString()}</button>;
}
```

### 4. API Routes

**Route Handlers** (app/api/*/route.ts):
```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Process body
  return NextResponse.json({ success: true });
}
```

**X402 Protocol Integration**:
```typescript
// All X402 routes go through middleware
import { x402Middleware } from "@/lib/x402-middleware";

export async function POST(request: NextRequest) {
  // Middleware handles payment verification
  const result = await x402Middleware(request);
  if (!result.authorized) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  // Proceed with request
  const data = await processRequest();
  return NextResponse.json(data);
}
```

### 5. Environment Variables

**Public variables** (accessible in browser):
```typescript
// Must start with NEXT_PUBLIC_
const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const programId = process.env.NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID;
```

**Private variables** (server-only):
```typescript
// Server components, API routes, Convex functions only
const apiKey = process.env.HELIUS_API_KEY;
const secretKey = process.env.CROSSMINT_SECRET_KEY;
```

**Required for development**:
- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
- `CONVEX_DEPLOYMENT` - Target deployment (dev:lovely-cobra-639 or prod:enduring-porpoise-79)
- `NEXT_PUBLIC_SOLANA_RPC_URL` - Solana RPC endpoint
- `NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID` - Smart contract address

### 6. TailwindCSS 4 Patterns

```typescript
// ✅ Use Tailwind utility classes
<div className="flex items-center gap-4 p-6 bg-background text-foreground">
  <h1 className="text-2xl font-bold">Title</h1>
</div>

// ✅ Use CSS variables for colors (defined in globals.css)
<div className="bg-primary text-primary-foreground">

// ❌ Avoid inline styles unless absolutely necessary
<div style={{ padding: "24px" }}> // Use className="p-6" instead
```

### 7. ElizaOS Agent Integration

**Caisper Chat** (apps/web/app/caisper/page.tsx):
```typescript
"use client";
import { useElizaRuntime } from "@/hooks/useElizaRuntime";

export function CaisperChat() {
  const { sendMessage, messages, isLoading } = useElizaRuntime({
    character: "caisper",
    agentId: process.env.NEXT_PUBLIC_CAISPER_AGENT_ID,
  });

  return (
    <div>
      <MessageList messages={messages} />
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
```

**Message Quota System**:
```typescript
// Convex handles quota enforcement
const canSend = await ctx.runQuery(api.messageQuota.checkQuota, {
  userId: user._id,
});

if (!canSend) {
  throw new Error("Message quota exceeded. Stake GHOST tokens for more.");
}
```

### 8. Testing Patterns

**Component Tests** (using React Testing Library):
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "bun:test";

describe("AgentCard", () => {
  it("displays agent information", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText(mockAgent.name)).toBeDefined();
  });
});
```

**E2E Tests** (Playwright):
```typescript
// tests/e2e/wallet-auth.spec.ts
import { test, expect } from "@playwright/test";

test("wallet authentication flow", async ({ page }) => {
  await page.goto("http://localhost:3333");
  await page.click('button:has-text("Connect Wallet")');
  await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
});
```

## Development Workflow

### Starting Dev Server
```bash
cd apps/web
bun run dev  # Starts Next.js on :3333 + Convex dev mode
```

### Building for Production
```bash
bun run build       # Build Next.js + deploy Convex prod
bun run build:web   # Build Next.js only
```

### Testing
```bash
bun test                    # All tests
bun run test:e2e           # Playwright E2E tests
bun run test:watch         # Watch mode
```

### Convex Commands
```bash
bunx convex dev            # Dev mode (lovely-cobra-639)
bunx convex deploy         # Deploy to prod (enduring-porpoise-79)
bunx convex logs           # View logs
bunx convex dashboard      # Open dashboard
```

## File Structure

```
apps/web/
├── app/                        # Next.js App Router
│   ├── (auth)/                # Route groups
│   ├── api/                   # API routes
│   │   ├── v1/               # Versioned API
│   │   ├── agent/            # Agent endpoints
│   │   └── x402/             # X402 protocol
│   ├── caisper/              # ElizaOS chat
│   ├── dashboard/            # User dashboard
│   └── layout.tsx            # Root layout
├── components/                # React components
│   ├── auth/                 # Wallet, sessions
│   ├── chat/                 # Chat UI
│   ├── dashboard/            # Dashboard components
│   └── ui/                   # Reusable UI
├── convex/                    # Convex backend
│   ├── _generated/           # Auto-generated types
│   ├── schema.ts             # Database schema
│   ├── ghostDiscovery.ts     # Agent discovery
│   ├── x402Indexer.ts        # Payment indexing
│   └── crons.ts              # Scheduled jobs
├── hooks/                     # React hooks
├── lib/                       # Utilities
├── public/                    # Static assets
└── e2e/                      # E2E tests
```

## Common Pitfalls

### ❌ Don't: Mix Server and Client Components Incorrectly
```typescript
// BAD: Server component importing client component directly
import ClientComponent from "./ClientComponent"; // Has "use client"
export default async function ServerPage() {
  const data = await fetchData();
  return <ClientComponent data={data} />; // Props must be serializable!
}
```

### ✅ Do: Pass Serializable Props
```typescript
// GOOD: Only pass JSON-serializable data
export default async function ServerPage() {
  const data = await fetchData();
  return <ClientComponent data={JSON.parse(JSON.stringify(data))} />;
}
```

### ❌ Don't: Use Convex in Server Components
```typescript
// BAD: Convex hooks only work in client components
export default async function Page() {
  const data = useQuery(api.agents.list); // ERROR!
}
```

### ✅ Do: Use Convex in Client Components or API Routes
```typescript
"use client";
export default function Page() {
  const data = useQuery(api.agents.list); // ✅
}
```

### ❌ Don't: Expose Secrets in Client Code
```typescript
// BAD: Secret in client component
"use client";
const secret = process.env.CROSSMINT_SECRET_KEY; // Exposed to browser!
```

### ✅ Do: Keep Secrets Server-Side
```typescript
// GOOD: Secret in API route or Convex action
export async function POST() {
  const secret = process.env.CROSSMINT_SECRET_KEY; // Server-only
}
```

## Performance Best Practices

1. **Use React Server Components** for data fetching (no client bundle bloat)
2. **Implement loading.tsx** in routes for Suspense boundaries
3. **Use dynamic imports** for heavy client components:
   ```typescript
   const HeavyComponent = dynamic(() => import("./Heavy"), { ssr: false });
   ```
4. **Optimize Convex queries** with indexes (defined in schema.ts)
5. **Use Image component** from next/image for automatic optimization
6. **Implement pagination** for large lists (don't load everything at once)

## Security Checklist

- [ ] Validate all user input (Zod schemas in Convex functions)
- [ ] Never trust client-provided data (verify on server)
- [ ] Use CSRF protection for state-changing operations
- [ ] Implement rate limiting for API routes
- [ ] Sanitize data before rendering (prevent XSS)
- [ ] Keep environment variables secure (never commit .env files)
- [ ] Verify wallet signatures for authentication
- [ ] Use HTTPS in production (Vercel handles this)

## Deployment

**Platform**: Vercel (production) / localhost:3333 (dev)
**Environment**:
- Dev: lovely-cobra-639.convex.cloud
- Prod: enduring-porpoise-79.convex.cloud

**Pre-deployment checklist**:
1. Run `bun test` - all tests must pass
2. Run `bun run build` - verify no build errors
3. Check environment variables are set in Vercel
4. Deploy Convex: `CONVEX_DEPLOYMENT=prod:enduring-porpoise-79 bunx convex deploy`
5. Deploy Next.js: `git push` (triggers Vercel deploy)

## Additional Resources

- Next.js 15 Docs: https://nextjs.org/docs
- Convex Docs: https://docs.convex.dev
- React 19 Docs: https://react.dev
- TailwindCSS 4: https://tailwindcss.com/docs
- Solana @solana/kit: https://github.com/solana-labs/solana-web3.js/tree/v2
