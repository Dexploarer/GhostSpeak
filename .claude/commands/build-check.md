# Verify Builds Across Monorepo

Check that all packages build successfully and report any issues.

## What This Command Does

1. Runs `bun run build` for critical packages in dependency order
2. Verifies build artifacts exist
3. Reports build failures with context
4. Suggests fixes for common build issues

## Usage

```bash
/build-check
```

## Build Order

Packages are built in dependency order:

1. **SDK** (`packages/sdk-typescript/`)
   - Required by: CLI, API, Web, Plugin

2. **CLI** (`packages/cli/`)
   - Standalone binary

3. **API** (`packages/api/`)
   - REST API server

4. **Plugin** (`packages/plugin-ghostspeak/`)
   - ElizaOS plugin

5. **Web** (`apps/web/`)
   - Next.js application
   - Convex deployment

## Verification Checks

For each package, verify:

- ✅ Build command succeeds
- ✅ Output directory exists (`dist/` or `.next/`)
- ✅ Main entry point exists
- ✅ Type definitions generated (if applicable)
- ✅ No TypeScript errors

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| SDK build fails | Anchor IDL missing | Run `anchor build` first |
| Web build fails | Missing SDK | Build SDK first |
| Type errors | Outdated types | Run `bun run type-check` |
| Cache issues | Stale Turbo cache | Run `bun run build --force` |

## Example Output

```
Checking builds across monorepo...

📦 packages/sdk-typescript
✅ Build successful (2.3s)
✅ dist/index.js exists
✅ dist/index.d.ts exists
✅ 47 modules bundled

📦 packages/cli
✅ Build successful (1.1s)
✅ dist/index.js exists
✅ Shebang present

📦 apps/web
❌ Build failed
Error: Cannot find module '@ghostspeak/sdk'
Fix: SDK not built or not linked. Run:
  cd packages/sdk-typescript && bun run build
  bun install

Build Summary:
✅ 3 passed
❌ 1 failed

Total time: 8.7s
Cache hit rate: 64%
```

## Related Commands

- `/test-all` - Run tests after builds pass
- `/context-load monorepo` - Load monorepo architecture knowledge
