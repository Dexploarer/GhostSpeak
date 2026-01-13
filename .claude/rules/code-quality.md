---
globs: ["**/*.{ts,tsx,js,jsx,rs}"]
description: Code quality, naming conventions, and production-ready standards
---

# Code Quality & Naming Conventions

## Production-Ready Standards

### ❌ NEVER Create These (Common Agent Mistakes)

**Verbose Comments:**
```typescript
// ❌ WRONG: Agent-created verbose descriptions
// Boo: Full creative marketing suite
// Caisper: Ghost marketplace concierge service
// AgentX: Advanced reputation verification system

// ✅ CORRECT: Production-ready comments
// GhostSpeak community marketing
// Agent marketplace concierge
// Reputation verification system
```

**Overly Descriptive File Names:**
```typescript
// ❌ WRONG: Agent-created file names
"boo_full_creative_marketing_suite.ts"
"caisper_ghost_marketplace_concierge.ts"
"agentx_advanced_reputation_verification.ts"

// ✅ CORRECT: Production-ready file names
"marketing.ts"
"concierge.ts"
"verification.ts"
```

**Verbose Variable Names:**
```typescript
// ❌ WRONG: Agent-created variable names
const ghostSpeakCommunityMarketingAction = () => {}
const caisperGhostMarketplaceConciergeService = () => {}
const agentXAdvancedReputationVerificationSystem = () => {}

// ✅ CORRECT: Production-ready variable names
const marketingAction = () => {}
const conciergeService = () => {}
const verificationSystem = () => {}
```

### ✅ ALWAYS Use These Patterns

**File Naming:**
```typescript
// ✅ Production-ready file naming
auth.ts              // Authentication logic
billing.ts           // Billing/payment logic
verification.ts      // Verification systems
index.ts             // Main exports
types.ts             // Type definitions
utils.ts             // Utility functions
```

**Function/Variable Naming:**
```typescript
// ✅ Clear, concise, production-ready
export const createSession = () => {}
export const verifyPayment = () => {}
export const getUserProfile = () => {}

const sessionToken: string
const paymentAmount: number
const userProfile: User
```

**Comments:**
```typescript
// ✅ Production-ready comments (brief, actionable)
// Generate marketing content for GhostSpeak community
// Handle agent marketplace concierge operations
// Verify reputation scores and credentials

// ❌ Avoid marketing-speak in code comments
// "Revolutionary AI-powered reputation verification system"
// "Next-generation Ghost marketplace concierge service"
```

## Code Organization Rules

### 1. Prefer Updating Existing Files Over Creating New Ones

**❌ DON'T:** Create new files when functionality already exists
```typescript
// Creating new file: marketing-suite.ts
// When existing file: marketing.ts already handles marketing
```

**✅ DO:** Update existing files to maintain proper naming
```typescript
// Update existing marketing.ts file
// Add new functionality to existing, properly named file
```

### 2. Use Consistent Import/Export Patterns

**❌ DON'T:** Verbose or inconsistent exports
```typescript
export const BooGhostSpeakCommunityMarketingAction = () => {}
export const CaisperGhostMarketplaceConciergeService = () => {}
```

**✅ DO:** Clean, consistent exports
```typescript
export const generateMarketingContent = () => {}
export const handleConciergeRequests = () => {}
```

### 3. Avoid Marketing Language in Code

**❌ DON'T:** Use sales/marketing language in technical code
```typescript
// "Revolutionary AI-powered system"
// "Next-generation concierge service"
// "Advanced verification technology"
```

**✅ DO:** Use technical, descriptive language
```typescript
// "Automated content generation system"
// "Request handling service"
// "Credential verification system"
```

## Agent Behavior Guidelines

### 🚫 NEVER Create These (Documentation Anti-Patterns)

**Summary Documents:**
```typescript
// ❌ WRONG: Agent creates unnecessary summaries
"Creating a summary document explaining the current system and its limitations"

// ✅ CORRECT: Just fix the issue
// Research the problem, identify the root cause, implement the fix
```

**Limitation Reports:**
```typescript
// ❌ WRONG: Agent creates limitation reports
"Now I see the issue! Let me create a summary document explaining the current system and its limitations"

// ✅ CORRECT: Fix directly
// Found the issue in checkGhostBalance.ts - fixing the user identification logic
```

**Status Reports:**
```typescript
// ❌ WRONG: Agent creates status updates
"Creating a comprehensive status report on the current implementation"

// ✅ CORRECT: Take action
// Updating the balance checking logic to properly validate users
```

### ✅ Research → Fix → Verify Pattern

**When encountering issues:**

1. **Research thoroughly** - Read all relevant files and understand the problem
2. **Identify root cause** - Don't just describe symptoms
3. **Fix directly** - Implement the solution immediately
4. **Verify the fix** - Test that it works
5. **Move on** - Don't create documentation unless explicitly requested

**Example of GOOD behavior:**
```typescript
// Research phase: Reading files to understand the issue
⏺ Read(components/providers/TelegramProvider.tsx)
⏺ Read(~/projects/GhostSpeak/apps/web/convex/checkGhostBalance.ts)

// Analysis phase: Identify the problem
⏺ Found the issue! User identification logic is incomplete

// Fix phase: Implement the solution
⏺ Updating checkGhostBalance.ts to properly validate Telegram users
⏺ Adding missing user lookup logic
⏺ Testing the fix works correctly
```

### When Adding New Features:

1. **Check existing files first** - Look for related functionality
2. **Update existing files** - Don't create new ones unnecessarily
3. **Use production naming** - No verbose, descriptive names
4. **Keep comments brief** - Technical purpose only
5. **Follow existing patterns** - Match codebase conventions
6. **Research → Fix → Verify** - No unnecessary documentation

### File Creation Checklist:

- [ ] Does this functionality already exist in another file?
- [ ] Can I add this to an existing, properly named file?
- [ ] Is the file name clear and production-ready?
- [ ] Do variable names follow conventions?
- [ ] Are comments brief and technical?

### Code Review Standards:

**Before committing, ensure:**
- No marketing language in comments
- File names are production-ready
- Variable names are clear but concise
- Functionality is added to existing files when possible
- Code follows established patterns

## Documentation Guidelines

**❌ NEVER Create Documentation For:**
- Routine bug fixes
- Implementation details that are obvious from code
- "Current system limitations" unless fixing them
- Status updates during development
- "Summary documents" of existing functionality

**✅ ONLY Create Documentation When:**
- User explicitly requests it
- New API endpoints or major features
- Complex business logic that needs explanation
- Migration guides for breaking changes
- Architecture decisions with trade-offs

## Common Agent Mistakes to Avoid

### Mistake 1: Creating Verbose File Names
```
❌ agent_advanced_reputation_verification_system.ts
✅ reputation.ts
```

### Mistake 2: Overly Descriptive Comments
```
❌ // AgentX: Advanced reputation verification system for GhostSpeak
✅ // Reputation verification system
```

### Mistake 3: Marketing Language in Code
```
❌ const revolutionaryVerificationSystem = () => {}
✅ const verifyCredentials = () => {}
```

### Mistake 4: Creating Duplicate Files
```
❌ Creating new "marketing-suite.ts" when "marketing.ts" exists
✅ Updating existing "marketing.ts" file
```

### Mistake 5: Unnecessary Summary Documents
```
❌ "Now I see the issue! Let me create a summary document explaining the current system and its limitations"
✅ "Found the issue in user validation logic - fixing it now"
```

### Mistake 6: Documentation Busywork
```
❌ "Let me create a comprehensive status report on the current implementation"
✅ "Updating the balance checking function to handle Telegram users properly"
```

## Enforcement

This rule auto-loads for **ALL code files** (`**/*.{ts,tsx,js,jsx,rs}`). When writing code:

1. **File names** should be clear, concise, production-ready
2. **Variable names** should follow TypeScript/JavaScript conventions
3. **Comments** should be brief and technical
4. **Functionality** should be added to existing files when possible
5. **Marketing language** should never appear in code comments

**Remember:** Code is for developers to maintain, not for marketing presentations.