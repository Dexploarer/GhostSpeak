# GhostSpeak Authentication Implementation Plan

**Date:** January 2, 2026
**Status:** Implementation Ready
**Architecture:** Crossmint (Frontend Auth) + Convex (Backend Database with JWT Validation)

---

## Table of Contents

1. [Current Status](#current-status)
2. [Architecture Overview](#architecture-overview)
3. [Authentication Flow](#authentication-flow)
4. [Implementation Steps](#implementation-steps)
5. [Code Components](#code-components)
6. [Testing Plan](#testing-plan)
7. [Security Considerations](#security-considerations)

---

## Current Status

### ✅ What's Already Implemented

1. **Crossmint SDK Integration** (`@crossmint/client-sdk-react-ui@^2.6.12`)
   - `CrossmintProvider` configured with API key
   - `CrossmintAuthProvider` with email + Solana wallet login
   - `CrossmintWalletProvider` creating Solana wallets on login
   - Custom theme matching GhostSpeak brand (#ccff00 lime green)

2. **Auth State Management**
   - Zustand store (`lib/stores/auth.store.ts`) with:
     - JWT storage and expiry tracking
     - Wallet address management
     - Convex user sync
     - localStorage persistence
     - Redux DevTools integration

3. **Auth Sync Engine** (`lib/auth/sync-engine.tsx`)
   - Syncs Crossmint SDK → Zustand store
   - Creates/updates Convex user records
   - Manages TanStack Query invalidation
   - Records user activity

4. **Convex Backend**
   - User schema with wallet address index
   - `users.upsert` mutation
   - `users.getByWallet` query
   - `users.recordActivity` mutation

5. **Convex Auth Configuration** (`convex/auth.config.ts`)
   - Configured for Crossmint OIDC
   - Domain: `https://staging.crossmint.com`
   - Application ID: `convex`

### ❌ What's Missing

1. **Providers Not Connected**
   - Crossmint providers not added to `app/providers.tsx`
   - Convex provider not set up
   - Auth sync engine not initialized

2. **ConvexProviderWithAuth Setup**
   - Need to create custom hook bridging Crossmint JWT → Convex
   - Need to implement `fetchAccessToken` function

3. **Environment Variables**
   - `NEXT_PUBLIC_CROSSMINT_API_KEY` (partially set)
   - `NEXT_PUBLIC_CONVEX_URL` (needs verification)
   - `CONVEX_DEPLOYMENT` (for production)

4. **UI Components**
   - Wallet connect button (exists but not integrated)
   - User profile dropdown
   - Login modal
   - Account settings page

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GhostSpeak Web App                              │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js 15 App Router                         │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ User Clicks "Connect Wallet"                               │ │  │
│  │  └────────────────┬───────────────────────────────────────────┘ │  │
│  │                   │                                              │  │
│  │                   ▼                                              │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ CrossmintAuthProvider                                      │ │  │
│  │  │ - Shows login modal                                        │ │  │
│  │  │ - Options: Email OTP, Solana Wallet                        │ │  │
│  │  │ - User authenticates                                       │ │  │
│  │  └────────────────┬───────────────────────────────────────────┘ │  │
│  │                   │                                              │  │
│  │                   ▼                                              │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ CrossmintWalletProvider                                    │ │  │
│  │  │ - Creates Solana smart wallet (MPC)                        │ │  │
│  │  │ - Returns wallet address                                   │ │  │
│  │  │ - Issues JWT token (OpenID Connect)                        │ │  │
│  │  └────────────────┬───────────────────────────────────────────┘ │  │
│  │                   │                                              │  │
│  │                   ▼                                              │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ AuthSyncEngine                                             │ │  │
│  │  │ - useAuth() from Crossmint → { jwt, status, user }         │ │  │
│  │  │ - syncFromCrossmint(jwt, status, walletAddress)            │ │  │
│  │  │ - Saves to Zustand store                                   │ │  │
│  │  └────────────────┬───────────────────────────────────────────┘ │  │
│  │                   │                                              │  │
│  │                   ▼                                              │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ Zustand Auth Store                                         │ │  │
│  │  │ - Stores jwt, walletAddress, user, status                  │ │  │
│  │  │ - Persists to localStorage                                 │ │  │
│  │  │ - Decodes JWT expiry                                       │ │  │
│  │  └────────────────┬───────────────────────────────────────────┘ │  │
│  │                   │                                              │  │
│  │                   ▼                                              │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ ConvexProviderWithAuth                                     │ │  │
│  │  │ - useAuth hook: { jwt, isAuthenticated }                   │ │  │
│  │  │ - fetchAccessToken: () => Promise<jwt>                     │ │  │
│  │  │ - Sends JWT to Convex on every request                     │ │  │
│  │  └────────────────┬───────────────────────────────────────────┘ │  │
│  │                   │                                              │  │
│  └───────────────────┼──────────────────────────────────────────────┘  │
│                      │                                                 │
│                      ▼                                                 │
│         ┌────────────────────────────┐                                │
│         │ Convex Backend             │                                │
│         │                            │                                │
│         │ ┌────────────────────────┐ │                                │
│         │ │ auth.config.ts         │ │                                │
│         │ │ - domain: crossmint    │ │                                │
│         │ │ - applicationID        │ │                                │
│         │ └───────────┬────────────┘ │                                │
│         │             │              │                                │
│         │             ▼              │                                │
│         │ ┌────────────────────────┐ │                                │
│         │ │ JWT Validation         │ │                                │
│         │ │ - Verify iss, aud, exp │ │                                │
│         │ │ - Extract user identity│ │                                │
│         │ └───────────┬────────────┘ │                                │
│         │             │              │                                │
│         │             ▼              │                                │
│         │ ┌────────────────────────┐ │                                │
│         │ │ Convex Functions       │ │                                │
│         │ │ - ctx.auth.getUserId() │ │                                │
│         │ │ - Queries/Mutations    │ │                                │
│         │ └────────────────────────┘ │                                │
│         └────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### 1. User Login Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│  Crossmint  │────▶│   Zustand   │────▶│   Convex    │
│ Clicks      │     │ Auth Modal  │     │   Store     │     │  Backend    │
│ "Connect"   │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                     │                   │                   │
      │  1. Open Modal      │                   │                   │
      ├────────────────────▶│                   │                   │
      │                     │                   │                   │
      │  2. Email/Wallet    │                   │                   │
      ├────────────────────▶│                   │                   │
      │                     │                   │                   │
      │  3. JWT + Wallet    │                   │                   │
      │◀────────────────────┤                   │                   │
      │                     │                   │                   │
      │                     │  4. Sync State    │                   │
      │                     ├──────────────────▶│                   │
      │                     │                   │                   │
      │                     │                   │  5. Create User   │
      │                     │                   ├──────────────────▶│
      │                     │                   │                   │
      │                     │                   │  6. User Doc      │
      │                     │                   │◀──────────────────┤
      │                     │                   │                   │
      │  7. Dashboard       │                   │                   │
      │◀────────────────────┴───────────────────┴───────────────────┤
```

### 2. Authenticated Request Flow

```
Component/Hook Request
       │
       ▼
useQuery/useMutation (Convex React hooks)
       │
       ▼
ConvexProviderWithAuth fetches JWT from Zustand
       │
       ▼
Sends request to Convex with JWT in header
       │
       ▼
Convex validates JWT against auth.config.ts
       │
       ▼
ctx.auth.getUserId() returns authenticated user
       │
       ▼
Query/mutation executes with user context
       │
       ▼
Result returned to component
```

### 3. JWT Refresh Flow

```
Every 5 minutes (before expiry):
1. Zustand store checks jwtExpiry
2. If < 5 min remaining:
   - Calls useAuth().refreshToken() from Crossmint
   - Gets new JWT
   - Updates Zustand store
   - Convex provider automatically uses new JWT
```

---

## Implementation Steps

### Step 1: Update Convex Auth Configuration

**File:** `convex/auth.config.ts`

```typescript
/**
 * Convex Authentication Configuration
 *
 * Validates JWT tokens from Crossmint's OIDC provider
 */

export default {
  providers: [
    {
      // Crossmint OIDC provider
      domain: process.env.CONVEX_SITE_URL?.includes('crossmint.com')
        ? process.env.CONVEX_SITE_URL
        : 'https://www.crossmint.com',
      applicationID: 'convex', // Must match JWT 'aud' claim
    },
  ],
}
```

**Note:** You'll need to verify the correct Crossmint OIDC `domain` and `applicationID` by inspecting the JWT token they issue.

### Step 2: Create Convex Auth Bridge Hook

**File:** `lib/hooks/useConvexAuth.tsx`

```typescript
'use client'

import { useCallback, useMemo } from 'react'
import { useAuth as useCrossmintAuth } from '@crossmint/client-sdk-react-ui'

/**
 * Bridge Crossmint auth to Convex's ConvexProviderWithAuth format
 *
 * Convex expects: { isLoading, isAuthenticated, fetchAccessToken }
 * Crossmint provides: { status, jwt }
 */
export function useConvexAuthFromCrossmint() {
  const { status, jwt } = useCrossmintAuth()

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean }) => {
      // If forcing refresh, call Crossmint's refresh method
      if (forceRefreshToken) {
        // Crossmint SDK should handle token refresh automatically
        // Just return the current JWT
        console.log('[Convex Auth] Forcing token refresh')
      }

      if (!jwt) {
        console.warn('[Convex Auth] No JWT available')
        return null
      }

      return jwt
    },
    [jwt]
  )

  return useMemo(
    () => ({
      isLoading: status === 'in-progress',
      isAuthenticated: status === 'logged-in' && !!jwt,
      fetchAccessToken,
    }),
    [status, jwt, fetchAccessToken]
  )
}
```

### Step 3: Update Providers

**File:** `app/providers.tsx`

```typescript
'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider'
import { WalletContextProvider } from '@/components/wallet/WalletProvider'
import { AuthSyncEngine } from '@/lib/auth/sync-engine'
import { ConvexProvider, ConvexProviderWithAuth } from 'convex/react'
import { ConvexReactClient } from 'convex/react'
import { useConvexAuthFromCrossmint } from '@/lib/hooks/useConvexAuth'
import * as React from 'react'

// Create Convex client (singleton)
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Wrapper to use the auth hook
function ConvexAuthWrapper({ children }: { children: React.ReactNode }) {
  const convexAuth = useConvexAuthFromCrossmint()

  return (
    <ConvexProviderWithAuth client={convex} useAuth={() => convexAuth}>
      {children}
    </ConvexProviderWithAuth>
  )
}

export function Providers(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SmoothScrollProvider>
        {/* Crossmint Auth + Wallet */}
        <WalletContextProvider>
          {/* Convex with Crossmint JWT */}
          <ConvexAuthWrapper>
            {/* Auth sync engine (Crossmint → Zustand → Convex) */}
            <AuthSyncEngine>
              {props.children}
            </AuthSyncEngine>
          </ConvexAuthWrapper>
        </WalletContextProvider>
      </SmoothScrollProvider>
    </ThemeProvider>
  )
}
```

### Step 4: Update Convex User Queries to Use Auth

**File:** `convex/users.ts` (add authenticated queries)

```typescript
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Get current authenticated user
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    // Extract wallet address from JWT subject or custom claim
    const walletAddress = identity.subject || identity.tokenIdentifier

    return await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', walletAddress))
      .first()
  },
})

/**
 * Upsert user (create or update)
 */
export const upsert = mutation({
  args: {
    walletAddress: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    // Check if user exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_wallet', (q) => q.eq('walletAddress', args.walletAddress))
      .first()

    const now = Date.now()

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        lastActiveAt: now,
        ...(args.email && { email: args.email }),
        ...(args.name && { name: args.name }),
      })
      return existing._id
    } else {
      // Create new user
      const userId = await ctx.db.insert('users', {
        walletAddress: args.walletAddress,
        email: args.email,
        name: args.name,
        createdAt: now,
        lastActiveAt: now,
      })
      return userId
    }
  },
})

/**
 * Record user activity
 */
export const recordActivity = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    await ctx.db.patch(args.userId, {
      lastActiveAt: Date.now(),
    })
  },
})
```

### Step 5: Create Wallet Connect UI Component

**File:** `components/wallet/WalletConnectButton.tsx`

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { useAuth, useWallet } from '@crossmint/client-sdk-react-ui'
import { useAuthStore } from '@/lib/stores/auth.store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Wallet } from 'lucide-react'

export function WalletConnectButton() {
  const { login, logout, status } = useAuth()
  const { wallet } = useWallet()
  const { isAuthenticated, shortAddress } = useAuthStore()

  if (status === 'in-progress') {
    return (
      <Button disabled variant="outline" size="sm">
        Connecting...
      </Button>
    )
  }

  if (!isAuthenticated || !wallet) {
    return (
      <Button onClick={login} variant="default" size="sm">
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Wallet className="w-4 h-4 mr-2" />
          {shortAddress}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem disabled>
          <User className="w-4 h-4 mr-2" />
          {wallet.address}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Step 6: Add to Navigation

**File:** `components/layout/Navigation.tsx`

```typescript
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'

export function Navigation() {
  return (
    <nav className="...">
      {/* ... existing nav items ... */}

      {/* Add wallet connect button */}
      <WalletConnectButton />
    </nav>
  )
}
```

### Step 7: Environment Variables

**File:** `.env.local` (add/verify)

```bash
# Crossmint
NEXT_PUBLIC_CROSSMINT_API_KEY=your_staging_or_production_key
CROSSMINT_SECRET_KEY=your_secret_key
CROSSMINT_PROJECT_ID=000fb86e-0c51-4915-85c1-62ebe6baa2e4

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment-name
```

**File:** `convex/.env` (for Convex CLI)

```bash
CONVEX_DEPLOYMENT=your-deployment-name
```

---

## Code Components

### Component Hierarchy

```
app/
├── layout.tsx
│   └── providers.tsx
│       ├── ThemeProvider
│       ├── SmoothScrollProvider
│       └── WalletContextProvider (Crossmint)
│           ├── CrossmintProvider
│           ├── CrossmintAuthProvider
│           └── CrossmintWalletProvider
│               └── ConvexProviderWithAuth
│                   └── AuthSyncEngine
│                       └── children (app pages)
```

### State Flow

```
1. Crossmint SDK State:
   - useAuth() → { status, jwt, user }
   - useWallet() → { wallet: { address }, status }

2. Zustand Store (lib/stores/auth.store.ts):
   - syncFromCrossmint(jwt, status, address)
   - Persists to localStorage
   - Decodes JWT expiry

3. Convex Provider:
   - useConvexAuthFromCrossmint() bridge
   - Sends JWT on every request
   - ctx.auth.getUserIdentity() in Convex functions

4. TanStack Query:
   - useQuery/useMutation from Convex
   - Automatic auth invalidation
   - Real-time subscriptions
```

---

## Testing Plan

### 1. Manual Testing Checklist

- [ ] Click "Connect Wallet" button
- [ ] Login with email OTP
- [ ] Login with Solana wallet (Phantom/Solflare)
- [ ] Verify wallet address appears in UI
- [ ] Check localStorage for persisted auth state
- [ ] Refresh page - should stay logged in
- [ ] Open DevTools → Application → Local Storage → `ghostspeak-auth`
- [ ] Verify JWT, walletAddress, user saved
- [ ] Open DevTools → Redux → GhostSpeak Auth store
- [ ] Verify state updates on login/logout
- [ ] Make authenticated Convex query
- [ ] Check network tab for JWT in request headers
- [ ] Logout and verify state clears
- [ ] Verify TanStack queries invalidated

### 2. Unit Tests

**File:** `lib/hooks/__tests__/useConvexAuth.test.tsx`

```typescript
import { renderHook } from '@testing-library/react'
import { useConvexAuthFromCrossmint } from '../useConvexAuth'
import { useAuth } from '@crossmint/client-sdk-react-ui'

jest.mock('@crossmint/client-sdk-react-ui')

describe('useConvexAuthFromCrossmint', () => {
  it('returns loading state when Crossmint is in progress', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      status: 'in-progress',
      jwt: null,
    })

    const { result } = renderHook(() => useConvexAuthFromCrossmint())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('returns authenticated when logged in with JWT', () => {
    const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    ;(useAuth as jest.Mock).mockReturnValue({
      status: 'logged-in',
      jwt: mockJWT,
    })

    const { result } = renderHook(() => useConvexAuthFromCrossmint())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(true)
  })
})
```

### 3. E2E Tests (Playwright)

**File:** `tests/e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should login with email and create Convex user', async ({ page }) => {
    await page.goto('/')

    // Click connect wallet
    await page.click('text=Connect Wallet')

    // Wait for Crossmint modal
    await page.waitForSelector('[data-testid="crossmint-auth-modal"]')

    // Enter email
    await page.fill('input[type="email"]', 'test@ghostspeak.io')
    await page.click('text=Continue')

    // Enter OTP (use test code in dev)
    await page.fill('input[type="text"]', '123456')
    await page.click('text=Verify')

    // Wait for wallet address in UI
    await expect(page.locator('text=/[A-Za-z0-9]{4}...[A-Za-z0-9]{4}/')).toBeVisible()

    // Verify localStorage
    const authState = await page.evaluate(() => {
      return localStorage.getItem('ghostspeak-auth')
    })
    expect(authState).toBeTruthy()
    expect(JSON.parse(authState!).address).toBeTruthy()
  })
})
```

---

## Security Considerations

### 1. JWT Validation

- ✅ **Convex validates JWT automatically** via `auth.config.ts`
- ✅ Checks `iss` (issuer) matches Crossmint domain
- ✅ Checks `aud` (audience) matches `applicationID`
- ✅ Checks `exp` (expiry) is not in the past
- ✅ Verifies signature against Crossmint's public keys

### 2. Token Storage

- ✅ **JWT stored in localStorage** (not sessionStorage)
  - Pros: Persists across tabs and page refreshes
  - Cons: Vulnerable to XSS (mitigated by Next.js CSP)
- ❌ **DO NOT store in cookies** (Crossmint handles this)
- ✅ **Zustand store auto-expires** tokens based on `exp` claim

### 3. HTTPS Only

- ✅ All Crossmint requests over HTTPS
- ✅ All Convex requests over HTTPS
- ✅ Vercel production deployment enforces HTTPS

### 4. Rate Limiting

- ✅ Crossmint has built-in rate limiting
- ✅ Convex has built-in rate limiting (100 requests/second per user)
- ⚠️ Consider adding custom rate limiting for API endpoints

### 5. CORS

- ✅ Convex allows requests from your domain only
- ✅ Set in Convex dashboard → Settings → Allowed Origins

### 6. XSS Protection

- ✅ Next.js CSP headers enabled
- ✅ All user input sanitized
- ✅ No `dangerouslySetInnerHTML` without sanitization

### 7. Wallet Security

- ✅ Crossmint MPC wallets (non-custodial)
- ✅ Private keys never leave Crossmint's secure enclave
- ✅ User can export wallet to self-custody

---

## Common Issues and Solutions

### Issue 1: "Missing NEXT_PUBLIC_CONVEX_URL"

**Solution:**
```bash
cd packages/web
bunx convex dev
# Copy the URL from output
echo "NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud" >> .env.local
```

### Issue 2: "JWT validation failed: Invalid audience"

**Solution:** Check that `auth.config.ts` `applicationID` matches JWT `aud` claim:

```bash
# Decode JWT to see claims
echo "YOUR_JWT_HERE" | cut -d. -f2 | base64 -d | jq
```

If `aud` is different, update `auth.config.ts`:

```typescript
export default {
  providers: [
    {
      domain: 'https://www.crossmint.com',
      applicationID: 'ACTUAL_AUD_CLAIM_HERE', // Match this!
    },
  ],
}
```

### Issue 3: "User not created in Convex"

**Solution:** Check `AuthSyncEngine` logs:

```javascript
// In browser console
localStorage.getItem('ghostspeak-auth')
```

Verify:
- `address` is present
- `isAuthenticated` is true
- `user` is populated after a few seconds

If `user` is null, check Convex dashboard → Logs for errors.

### Issue 4: "Crossmint modal not showing"

**Solution:** Verify API key:

```bash
# Check .env.local
cat .env.local | grep CROSSMINT_API_KEY

# Verify in Crossmint console
# https://www.crossmint.com/console → API Keys
```

---

## Next Steps

After implementation is complete:

1. **Add Wallet Balance Display**
   - Query Solana RPC for SOL balance
   - Query for SPL token balances (USDC, GHOST)

2. **Add Transaction Signing**
   - Use Crossmint's `wallet.signTransaction()` method
   - Integrate with GhostSpeak SDK

3. **Add Profile Page**
   - `/profile` route
   - Display user info, wallet addresses
   - Transaction history

4. **Add Settings Page**
   - `/settings` route
   - Email notifications
   - API key management
   - Danger zone (delete account)

5. **Add Social Login**
   - Crossmint supports Google, Twitter, Farcaster
   - Add to `loginMethods` array

6. **Add Multi-Chain Support**
   - Crossmint supports Ethereum, Polygon, etc.
   - Update `chain` in `CrossmintWalletProvider`

---

## Resources

- [Crossmint Docs](https://docs.crossmint.com/)
- [Convex Auth Guide](https://docs.convex.dev/auth)
- [Convex Custom Auth](https://docs.convex.dev/auth/advanced/custom-auth)
- [OpenID Connect Spec](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT.io Debugger](https://jwt.io/)

---

**Status:** Ready for implementation
**Estimated Time:** 2-3 hours
**Risk Level:** Low (all components already built, just need to wire them together)
