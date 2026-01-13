# Cleanup Code Quality Issues

**Command**: `/cleanup-code [file-pattern]`

**Purpose**: Automatically clean up verbose naming, comments, and file organization issues in code files.

## What It Does

This command scans code files and automatically fixes common agent-generated issues:

### 1. **Verbose Comments**
```typescript
// BEFORE:
// Boo: Full creative marketing suite
// Caisper: Ghost marketplace concierge service

// AFTER:
// GhostSpeak community marketing
// Agent marketplace concierge
```

### 2. **Overly Descriptive File Names**
```bash
# BEFORE:
boo_full_creative_marketing_suite.ts
caisper_ghost_marketplace_concierge.ts

# AFTER:
marketing.ts
concierge.ts
```

### 3. **Marketing Language in Code**
```typescript
// BEFORE:
const revolutionaryVerificationSystem = () => {}

// AFTER:
const verifyCredentials = () => {}
```

### 4. **Verbose Variable Names**
```typescript
// BEFORE:
const ghostSpeakCommunityMarketingAction = () => {}

// AFTER:
const marketingAction = () => {}
```

### 5. **Unnecessary Documentation Creation**
```typescript
// BEFORE (in agent thinking):
"Now I see the issue! Let me create a summary document explaining the current system and its limitations"

// AFTER (in agent thinking):
"Found the issue in user validation logic - fixing it now"
```

## Usage

### Clean Specific Files
```bash
/cleanup-code "packages/plugin-ghostspeak/src/actions/*.ts"
```

### Clean All Plugin Files
```bash
/cleanup-code "packages/plugin-ghostspeak/**/*.ts"
```

### Clean Web App Files
```bash
/cleanup-code "apps/web/**/*.ts"
```

## Behavior

1. **Scans** all matching files for code quality issues
2. **Reports** found issues with before/after examples
3. **Asks for confirmation** before making changes
4. **Creates backup** of original files (`.backup` extension)
5. **Applies fixes** systematically
6. **Verifies** changes don't break syntax

## Safety Features

- **Backup Creation**: Original files saved as `.backup`
- **Syntax Validation**: Checks TypeScript/JavaScript syntax after changes
- **Confirmation Required**: User must approve changes
- **Selective Application**: Only fixes identified issues
- **Rollback Option**: Can restore from `.backup` files

## Common Issues Fixed

### Character-Specific Comments
```typescript
// Agent adds character-specific verbose comments
} else if (characterId === 'boo') {
  // Boo: Full creative marketing suite
  runtime.registerAction(generateImageAction)
}

// Becomes:
} else if (characterId === 'boo') {
  // GhostSpeak community marketing
  runtime.registerAction(generateImageAction)
}
```

### Marketing Language Removal
```typescript
// Agent uses marketing language in technical code
// "Revolutionary AI-powered reputation verification system"

// Becomes:
// "Reputation verification system"
```

### Documentation Busywork Removal
```typescript
// Agent creates unnecessary documentation
// "Let me create a summary document explaining the current system and its limitations"

// Becomes:
// Direct action: "Found the issue in user validation logic - fixing it now"
```

### File Consolidation
When multiple files serve the same purpose:
- `marketing.ts` + `marketing-suite.ts` → consolidate into `marketing.ts`
- `verification.ts` + `reputation-verification.ts` → consolidate into `verification.ts`

## Integration with Rules

This command works alongside the `code-quality.md` rule to:

1. **Prevent** new issues (rule enforcement)
2. **Clean up** existing issues (command execution)
3. **Maintain** production-ready standards across the codebase

## When to Use

- After agent-generated code that needs cleanup
- Before committing code changes
- During code review process
- When consolidating related functionality

## Example Output

```
/cleanup-code "packages/plugin-ghostspeak/**/*.ts"

Found 3 files with issues:

📁 packages/plugin-ghostspeak/src/actions/marketing.ts
  ❌ Verbose comment: "Boo: Full creative marketing suite"
  ❌ Verbose variable: "ghostSpeakCommunityMarketingAction"

📁 packages/plugin-ghostspeak/src/actions/concierge.ts
  ❌ Marketing language: "Revolutionary concierge service"

📁 packages/plugin-ghostspeak/src/actions/verification.ts
  ❌ Overly descriptive variable: "advancedReputationVerificationSystem"

Apply fixes? (y/N): y

✅ Fixed packages/plugin-ghostspeak/src/actions/marketing.ts
✅ Fixed packages/plugin-ghostspeak/src/actions/concierge.ts
✅ Fixed packages/plugin-ghostspeak/src/actions/verification.ts

Backups created:
- packages/plugin-ghostspeak/src/actions/marketing.ts.backup
- packages/plugin-ghostspeak/src/actions/concierge.ts.backup
- packages/plugin-ghostspeak/src/actions/verification.ts.backup
```

## Rollback

If issues arise, rollback using backups:

```bash
# Restore single file
mv marketing.ts.backup marketing.ts

# Restore all backups
find . -name "*.backup" -exec bash -c 'mv "$1" "${1%.backup}"' _ {} \;
```