# GhostSpeak Web App Bug Hunting Competition

> **Competition Start:** TBD
> **Competition End:** TBD
> **Prize Pool:** Best bug wins recognition

## Overview

5 specialized AI agents will compete to find the most critical and impactful bugs in the GhostSpeak web application. Each agent has a specific focus area to maximize coverage and prevent overlap.

---

## Agent Assignments

### Agent 1: "AuthGuard" - Authentication & Session Security

**Mission:** Find vulnerabilities and bugs in the authentication and session management system.

**Focus Areas:**
- Wallet authentication flow (SIWS/Sign-In-With-Solana)
- Session verification and localStorage handling
- Protected route access (dashboard requires verified session)
- Token validation and expiration
- Cross-tab session synchronization
- Auto-reconnect edge cases

**Priority Files:**
```
apps/web/app/dashboard/page.tsx (lines 197-241: session gating)
apps/web/lib/auth/verifiedSession.ts
apps/web/lib/auth/solana.ts
apps/web/lib/wallet/WalletStandardProvider.tsx
apps/web/convex/solanaAuth.ts
```

**Known Attack Vectors:**
- Session hijacking via localStorage manipulation
- Race conditions during wallet auto-connect
- Bypass of verification contract requirement
- Token expiration not enforced
- Cross-tab session confusion

---

### Agent 2: "DataHunter" - Data Flow & State Management

**Mission:** Find bugs in data fetching, state management, and API interactions.

**Focus Areas:**
- Convex query/mutation error handling
- Real-time data synchronization issues
- API endpoint validation and error responses
- Rate limiting bypass attempts
- Data consistency between client/server
- Stale data and cache invalidation

**Priority Files:**
```
apps/web/app/api/**/*.ts (all API routes)
apps/web/convex/*.ts (all Convex functions)
apps/web/lib/rate-limit.ts
apps/web/app/dashboard/page.tsx (data fetching)
apps/web/convex/apiKeys.ts
apps/web/convex/dashboard.ts
```

**Known Attack Vectors:**
- Query parameter injection
- Missing authentication checks
- Race conditions in mutations
- Unbounded queries causing performance issues
- Missing rate limits on expensive operations

---

### Agent 3: "UIBreaker" - Frontend & User Experience

**Mission:** Break the UI and find rendering, validation, and accessibility bugs.

**Focus Areas:**
- React component rendering bugs
- Form validation bypasses
- Responsive design breakpoints
- Accessibility violations (ARIA, keyboard navigation)
- Loading states and race conditions
- Client-side input sanitization
- Error boundary edge cases

**Priority Files:**
```
apps/web/app/dashboard/page.tsx
apps/web/components/**/*.tsx
apps/web/app/agents/register/page.tsx
apps/web/components/dashboard/OnboardingWizard.tsx
apps/web/components/dashboard/UsernameOnboardingModal.tsx
apps/web/components/error-boundaries/
```

**Known Attack Vectors:**
- XSS via unsanitized user input
- Form submission with invalid data
- Component crash via malformed props
- Infinite loading states
- Broken responsive layouts
- Missing loading skeletons

---

### Agent 4: "ChainHawk" - Blockchain Integration

**Mission:** Find bugs in Solana blockchain integration and wallet interactions.

**Focus Areas:**
- Solana RPC connection failures
- Transaction signing errors
- Token account validation
- Network switching edge cases (devnet/mainnet)
- Wallet disconnect/reconnect bugs
- Legacy `@solana/web3.js` usage (should use v5 modular API)
- Payment transaction handling

**Priority Files:**
```
apps/web/lib/solana/client.ts
apps/web/lib/solana/transaction.ts
apps/web/lib/wallet/WalletStandardProvider.tsx
apps/web/lib/x402-middleware.ts
apps/web/convex/x402Indexer.ts
apps/web/lib/jupiter-ultra.ts
```

**Known Attack Vectors:**
- RPC endpoint failures not handled
- Transaction timeout edge cases
- Wrong network detection
- Token mint validation bypassed
- Legacy API usage causing bundle bloat
- Payment signature verification bugs

---

### Agent 5: "LogicNinja" - Business Logic & Edge Cases

**Mission:** Find bugs in core business logic, calculations, and state transitions.

**Focus Areas:**
- Ghost Score calculation bugs
- Ecto/Ghosthunter score computation
- Reputation tier threshold edge cases
- Credit/quota enforcement
- Revenue sharing calculations
- Staking reward logic
- Escrow state transitions
- Achievement unlock conditions

**Priority Files:**
```
apps/web/convex/ghostScoreCalculator.ts
apps/web/convex/dashboard.ts
apps/web/app/dashboard/page.tsx (lines 58-133: tier logic)
apps/web/convex/users.ts
apps/web/convex/staking*.ts
apps/web/convex/escrows*.ts
```

**Known Attack Vectors:**
- Score overflow/underflow
- Tier boundary conditions (e.g., exactly 2500 score)
- Integer division rounding errors
- Negative balance bugs
- Double-counting of activities
- State machine invalid transitions

---

## Bug Categories & Scoring

### 🔴 Critical (100 points each)
- **Authentication bypass** - Gain dashboard access without wallet verification
- **Unauthorized data access** - Read/modify other users' data
- **Payment/transaction manipulation** - Bypass payment or alter amounts
- **RCE or XSS vulnerabilities** - Execute code or inject scripts
- **Data corruption bugs** - Corrupt database state or user records

**Examples:**
- Bypass SIWS verification to access dashboard
- Access another user's API keys
- Manipulate Ghost Score calculation
- XSS in username field

---

### 🟠 High (50 points each)
- **Rate limit bypasses** - Exceed API quotas
- **Broken access control** - Access unauthorized features
- **Data validation failures** - Submit invalid data
- **State desynchronization** - Client/server state mismatch
- **Error handling gaps** - Unhandled exceptions causing crashes

**Examples:**
- Bypass daily message quota
- Register agent with invalid address
- Submit malformed Convex mutations
- Race condition in staking logic

---

### 🟡 Medium (25 points each)
- **UI/UX bugs** affecting core flows (registration, dashboard)
- **Performance issues** - Slow queries, memory leaks
- **Missing error messages** - Silent failures
- **Accessibility violations** - WCAG AA failures
- **Race conditions** - Non-critical timing bugs

**Examples:**
- Dashboard infinite loading
- Missing ARIA labels
- Slow Ghost Score calculation
- Form doesn't show validation errors

---

### 🟢 Low (10 points each)
- **Cosmetic issues** - Visual glitches
- **Minor UX improvements** - Confusing labels
- **Documentation gaps** - Missing JSDoc
- **Console warnings** - React warnings, deprecations

**Examples:**
- Misaligned buttons on mobile
- Console warning from useEffect
- Typo in error message

---

## Submission Template

Use this template for each bug report:

```markdown
## Bug #[NUMBER]: [CONCISE TITLE]

**Severity:** Critical | High | Medium | Low
**Category:** Auth | Data | UI | Blockchain | Logic
**Discovered by:** Agent [Name]

### Description
[Clear description of the bug]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Affected Code
**File:** `apps/web/path/to/file.ts`
**Lines:** [line numbers]

```typescript
// Buggy code snippet
```

### Evidence
- Screenshot: [link or embedded]
- Network logs: [if applicable]
- Console errors: [paste errors]

### Impact Assessment
- **User Impact:** [High/Medium/Low]
- **Security Risk:** [Yes/No - explain]
- **Business Logic Risk:** [Yes/No - explain]

### Suggested Fix (Optional)
```typescript
// Proposed fix
```

### Additional Notes
[Any other relevant information]
```

---

## Submission Guidelines

1. **One bug per submission** - Don't bundle multiple issues
2. **Reproducible steps** - Must be consistently reproducible
3. **Evidence required** - Screenshots, logs, or video
4. **No duplicates** - Check existing submissions first
5. **Valid bugs only** - Not features or design choices

### Invalid Submissions
- Feature requests
- Design preferences
- Bugs in dependencies (submit upstream)
- Intentional behavior
- Already documented issues

---

## Winning Criteria

**Primary Scoring:**
- Total points from valid bugs
- Bonus: +50 points for first critical bug found
- Quality multiplier: Well-documented bugs get +10% points

**Tiebreaker:**
- Most critical bugs found
- Best reproduction quality
- Most actionable fix suggestions

**Bonus Awards:**
- "Security Champion" - Most auth/security bugs
- "Logic Master" - Most business logic bugs
- "Chain Breaker" - Most blockchain bugs
- "UX Guardian" - Most UI/UX bugs
- "Data Sleuth" - Most data flow bugs

---

## Competition Rules

1. **Scope:** Only `apps/web/` directory bugs
2. **No destructive testing** on production
3. **No social engineering** or phishing
4. **No DoS attacks** - Don't overload services
5. **Responsible disclosure** - Report critical bugs immediately

### Out of Scope
- Infrastructure bugs (Vercel, Convex platform)
- Third-party library bugs (unless integration issue)
- Browser compatibility (unless major browser)
- Theoretical attacks without PoC

---

## Timeline

**Phase 1: Reconnaissance (Day 1-2)**
- Read codebase
- Understand architecture
- Map attack surface

**Phase 2: Active Hunting (Day 3-7)**
- Execute test cases
- Document findings
- Submit reports

**Phase 3: Verification (Day 8-9)**
- Maintainer review
- Duplicate detection
- Scoring finalization

**Phase 4: Awards (Day 10)**
- Announce winners
- Publish Hall of Fame

---

## Judging Process

**Validation Steps:**
1. **Reproducibility Check** - Can maintainers reproduce?
2. **Severity Assessment** - Is the severity rating accurate?
3. **Impact Analysis** - What's the real-world impact?
4. **Duplicate Check** - Has this been reported before?
5. **Scoring** - Assign final points

**Judges:**
- GhostSpeak maintainers
- Security reviewer (for critical bugs)

---

## Hall of Fame

Top 3 agents will be featured in:
- README acknowledgments
- Competition recap blog post
- GhostSpeak Discord/community

---

## Technical Context

### Architecture Overview
- **Frontend:** Next.js 15, React 19, TypeScript
- **Backend:** Convex (real-time database)
- **Blockchain:** Solana (devnet + mainnet)
- **Auth:** Sign-In-With-Solana (SIWS)
- **Payments:** x402 protocol (USDC)

### Key Technologies
- **State Management:** Convex queries/mutations
- **Wallet:** Wallet Standard API
- **UI:** Tailwind CSS, Radix UI, Framer Motion
- **Forms:** React Hook Form + Zod

### Critical User Flows
1. **Wallet Connection** → SIWS → Dashboard Access
2. **Agent Registration** → Ghost Discovery → Reputation
3. **Verification** → Credentials → Score Updates
4. **Staking** → Reputation Boost → Rewards

---

## Resources

### Documentation
- [GhostSpeak Architecture](/.claude/ARCHITECTURE.md)
- [Convex Schema](apps/web/convex/schema.ts)
- [Solana Migration Guide](SOLANA_MIGRATION_COMPLETION.md)

### Testing Tools
- React DevTools
- Wallet adapter debug mode
- Convex dashboard (localhost:3000/convex)
- Solana Explorer (devnet/mainnet)

### Useful Commands
```bash
# Run dev server
bun run dev

# Type check
bun run type-check

# Run tests
bun run test

# Check ESLint
bun run lint
```

---

## Questions?

If you need clarification:
1. Check the codebase documentation
2. Review the Convex schema
3. Ask in competition channel

---

## Good Luck! 🎯

May the best bug hunter win. Remember: quality over quantity!

---

**Last Updated:** 2026-01-08
**Competition Version:** 1.0
