# Fix Issue Directly

**Command**: `/fix-issue [description]`

**Purpose**: Research, identify, and fix issues directly without creating unnecessary documentation or reports.

## What It Does

This command enforces the **Research → Fix → Verify** pattern:

### 1. **Research Phase** (Silent)
- Reads all relevant files
- Understands the problem thoroughly
- Identifies root cause

### 2. **Fix Phase** (Direct Action)
- Implements the solution immediately
- Updates existing files
- No verbose naming or comments

### 3. **Verify Phase** (Quick Test)
- Basic validation that the fix works
- No comprehensive testing reports

## Anti-Patterns Prevented

### ❌ Documentation Creation
```typescript
// WRONG: Creates unnecessary documentation
⏺ Now I see the issue! Let me create a summary document explaining the current system and its limitations
⏺ Creating comprehensive status report...

// RIGHT: Takes direct action
⏺ Found the issue in checkGhostBalance.ts - fixing user identification logic
⏺ Updated balance checking to properly validate Telegram users
```

### ❌ Status Reports
```typescript
// WRONG: Creates status reports
⏺ Let me create a comprehensive report on the current implementation status

// RIGHT: Fixes directly
⏺ Updating the balance validation logic
```

### ❌ Limitation Documents
```typescript
// WRONG: Documents limitations instead of fixing
⏺ The current system has these limitations: [long list]
⏺ Creating a summary document about these limitations

// RIGHT: Fixes the limitations
⏺ Fixed user identification in Telegram provider
⏺ Added proper balance checking for $GHOST tokens
```

## Usage Examples

### Fix User Authentication Issue
```bash
/fix-issue "Telegram users can't check their $GHOST balance"
```

**Expected Behavior:**
```
⏺ Reading TelegramProvider.tsx and checkGhostBalance.ts
⏺ Found issue: User identification logic incomplete
⏺ Updating checkGhostBalance.ts to properly validate Telegram users
⏺ Added missing user lookup for telegram_<user_id> format
⏺ Testing balance check works for Telegram users
✅ Fixed: Telegram users can now check their $GHOST balance
```

### Fix Payment Verification
```bash
/fix-issue "x402 payment verification is bypassed with TODO comment"
```

**Expected Behavior:**
```
⏺ Reading x402-middleware.ts and payment-verification.ts
⏺ Found issue: Payment verification disabled with TODO comment
⏺ Implementing real on-chain payment verification
⏺ Added Solana RPC calls to verify transactions
⏺ Testing payment verification works correctly
✅ Fixed: x402 payments now verified on-chain
```

## Command Behavior Rules

### ✅ What It Does
- **Research thoroughly** but silently
- **Fix issues directly** without fanfare
- **Update existing files** instead of creating new ones
- **Use production-ready naming** and comments
- **Verify fixes work** with minimal output

### ❌ What It Doesn't Do
- Create summary documents
- Generate status reports
- Document "current limitations"
- Create verbose explanations
- Generate comprehensive test reports

## Integration with Rules

This command works alongside the `code-quality.md` rule to:

1. **Prevent** documentation busywork (rule enforcement)
2. **Enforce** direct action taking (command execution)
3. **Maintain** focus on fixing rather than documenting

## When to Use

- When you want the agent to research and fix an issue directly
- When previous attempts created unnecessary documentation
- When you need a bug fixed without status updates or reports
- For straightforward fixes that don't need architectural documentation

## Success Criteria

**Good Output:**
```
⏺ Reading relevant files
⏺ Found the root cause
⏺ Implementing the fix
⏺ Testing the solution
✅ Issue resolved
```

**Bad Output:**
```
⏺ Let me research this thoroughly
⏺ Now I understand the issue! Let me create a comprehensive summary document
⏺ This system has several limitations that I should document...
⏺ Creating a detailed status report...
```

## Related Commands

- `/cleanup-code` - Clean up existing verbose code and documentation
- `/fix-issue` - Research and fix issues directly (this command)
- `/context-load` - Load deep context for complex issues

## Quick Reference

**For direct fixes:** `/fix-issue "description of the issue"`
**For code cleanup:** `/cleanup-code "file pattern"`
**For complex context:** `/context-load package`