# GhostSpeak Repository Structure

## Overview

GhostSpeak uses a **monorepo + multi-repo hybrid** architecture where:

- **Main monorepo** (`GhostSpeak`): Contains all packages for development
- **Individual package repos**: Each package is mirrored to its own GitHub repository for npm publishing

This approach gives us:
- ✅ **Unified development** in the monorepo
- ✅ **Independent versioning** for each package
- ✅ **Separate npm publishing** from individual repos
- ✅ **Focused issue tracking** per package

## Repository Map

### Main Monorepo

**Repository**: [`Ghostspeak/GhostSpeak`](https://github.com/Ghostspeak/GhostSpeak)

```
GhostSpeak/
├── programs/                    # Rust Solana programs (Anchor)
├── packages/
│   ├── cli/                    # TypeScript CLI (mirrored to cli repo)
│   ├── sdk-typescript/         # TypeScript SDK (mirrored to sdk repo)
│   ├── plugin-ghostspeak/      # ElizaOS plugin (mirrored to plugin repo)
│   ├── web/                    # Next.js web app (Convex backend)
│   └── api/                    # API server
├── docs/                       # Mintlify documentation
├── .env                        # Environment variables (shared)
└── package.json                # Workspace configuration
```

### Individual Package Repositories

| Package | Monorepo Path | Separate Repo | Purpose | NPM Package |
|---------|---------------|---------------|---------|-------------|
| **CLI** | `packages/cli/` | [`Ghostspeak/cli`](https://github.com/Ghostspeak/cli) | Command-line interface | `@ghostspeak/cli` |
| **SDK** | `packages/sdk-typescript/` | [`Ghostspeak/sdk`](https://github.com/Ghostspeak/sdk) | TypeScript SDK | `@ghostspeak/sdk` |
| **Plugin** | `packages/plugin-ghostspeak/` | [`Ghostspeak/plugin-ghostspeak`](https://github.com/Ghostspeak/plugin-ghostspeak) | ElizaOS plugin | `@ghostspeak/plugin-elizaos` |

## Git Remote Configuration

The monorepo has multiple remotes configured for each package:

```bash
# Main monorepo
origin          https://github.com/Ghostspeak/GhostSpeak.git

# Package remotes
cli-remote      https://github.com/Ghostspeak/cli.git
sdk-remote      https://github.com/Ghostspeak/sdk.git
plugin-remote   https://github.com/Ghostspeak/plugin-ghostspeak.git
```

### View Remote Configuration

```bash
# From the monorepo root
git remote -v
```

## Development Workflow

### 1. Working in the Monorepo

**Normal development happens in the monorepo:**

```bash
cd /Users/home/projects/GhostSpeak

# Make changes to packages
cd packages/cli
# Edit files...

# Build and test
bun run build
bun test

# Commit to monorepo
git add .
git commit -m "feat(cli): add Ghost claiming feature"
git push origin pivot  # or main
```

### 2. Publishing to Package Repositories

**After testing in monorepo, push to individual repos:**

#### Option A: Manual Push (Recommended)

```bash
# From the monorepo root
cd packages/cli

# Build the package
bun run build

# Add all changes
git add -A

# Commit changes
git commit -m "feat: add Ghost claiming with SAS attestation

- Add ghost-claim command with Convex integration
- Add Ghost Score display after successful claim
- Enhanced error messages with context-aware guidance
- Add ownership validation documentation
- Version bump to 2.0.0-beta.21"

# Push to the CLI repository
git subtree push --prefix=packages/cli cli-remote main
```

#### Option B: Using Scripts (If Available)

```bash
# From the monorepo root
bun run publish:cli    # Pushes CLI to cli-remote
bun run publish:sdk    # Pushes SDK to sdk-remote
bun run publish:plugin # Pushes Plugin to plugin-remote
```

### 3. NPM Publishing

**Publish from the individual package repo (not monorepo):**

```bash
# Clone the individual repo
git clone https://github.com/Ghostspeak/cli.git
cd cli

# Install dependencies
bun install

# Build
bun run build

# Publish to npm
npm publish --access public
```

## Versioning Strategy

Each package follows **independent semantic versioning**:

- **CLI**: Currently `2.0.0-beta.21`
- **SDK**: Currently `2.0.5`
- **Plugin**: Currently `1.0.0`

### Version Bump Process

1. **Update version in package.json**:
   ```bash
   cd packages/cli
   # Edit package.json: "version": "2.0.0-beta.21" → "2.0.0-beta.22"
   ```

2. **Update CHANGELOG** (if exists):
   ```bash
   # Document changes in CHANGELOG.md
   ```

3. **Commit and push to both repos**:
   ```bash
   # Commit to monorepo
   git commit -am "chore(cli): bump version to 2.0.0-beta.22"
   git push origin main

   # Push to package repo
   git subtree push --prefix=packages/cli cli-remote main
   ```

4. **Publish to npm** (from package repo)

## Why This Structure?

### Monorepo Benefits
- ✅ **Shared tooling**: Single ESLint, TypeScript, testing setup
- ✅ **Cross-package changes**: Easy to update SDK and CLI together
- ✅ **Unified development**: One `bun install` for everything
- ✅ **Type safety**: TypeScript references work across packages

### Multi-Repo Benefits
- ✅ **Independent releases**: Publish CLI without publishing SDK
- ✅ **Focused issues**: CLI issues go to cli repo, SDK issues to sdk repo
- ✅ **Smaller clones**: Users only clone what they need
- ✅ **NPM publishing**: Each package has its own release cycle

## Common Tasks

### Task 1: Add New Feature to CLI

```bash
cd /Users/home/projects/GhostSpeak/packages/cli

# 1. Create feature
# Edit files...

# 2. Test locally
bun run build
bun test
./dist/index.js --help

# 3. Bump version
# Edit package.json version

# 4. Commit to monorepo
git add .
git commit -m "feat(cli): add new feature"
git push origin main

# 5. Push to CLI repo
git subtree push --prefix=packages/cli cli-remote main

# 6. Publish to npm (from CLI repo)
cd /tmp
git clone https://github.com/Ghostspeak/cli.git
cd cli
bun install && bun run build
npm publish --access public
```

### Task 2: Update SDK Used by CLI

```bash
cd /Users/home/projects/GhostSpeak

# 1. Update SDK
cd packages/sdk-typescript
# Make changes...
bun run build

# 2. Update CLI to use new SDK
cd ../cli
# If needed, update package.json: "@ghostspeak/sdk": "^2.0.6"
bun install
bun run build

# 3. Test both together
bun test

# 4. Commit both packages
git add packages/sdk-typescript packages/cli
git commit -m "feat: update SDK and CLI together"
git push origin main

# 5. Push SDK first
git subtree push --prefix=packages/sdk-typescript sdk-remote main

# 6. Publish SDK to npm
# (from sdk repo)

# 7. Push CLI second
git subtree push --prefix=packages/cli cli-remote main

# 8. Publish CLI to npm
# (from cli repo)
```

### Task 3: Fix Bug in Published CLI

```bash
# 1. Fix in monorepo
cd /Users/home/projects/GhostSpeak/packages/cli
# Fix bug...
bun test

# 2. Bump patch version
# Edit package.json: 2.0.0-beta.21 → 2.0.0-beta.22

# 3. Commit to monorepo
git add .
git commit -m "fix(cli): resolve Ghost claim error handling"
git push origin main

# 4. Push to CLI repo
git subtree push --prefix=packages/cli cli-remote main

# 5. Publish hotfix to npm
cd /tmp
git clone https://github.com/Ghostspeak/cli.git
cd cli
bun install && bun run build
npm publish --access public
```

## Troubleshooting

### Issue: `git subtree push` is slow

**Solution**: Use `git push` with subtree split:

```bash
# One-time setup
git subtree split --prefix=packages/cli -b cli-branch

# Push the split branch
git push cli-remote cli-branch:main

# Clean up
git branch -D cli-branch
```

### Issue: Package repo is out of sync

**Solution**: Force push from monorepo:

```bash
# ⚠️ WARNING: This overwrites the package repo
git subtree push --prefix=packages/cli cli-remote main --force
```

### Issue: Need to pull changes from package repo

**Solution**: Use `git subtree pull`:

```bash
git subtree pull --prefix=packages/cli cli-remote main --squash
```

## Best Practices

1. **Always develop in monorepo first**
   - Don't edit files in individual package repos
   - Monorepo is the source of truth

2. **Test before pushing to package repos**
   - Run `bun test` in monorepo
   - Verify builds work: `bun run build`

3. **Keep versions in sync**
   - Update package.json version before pushing
   - Document changes in commit messages

4. **Use conventional commits**
   - `feat(cli): ...` for new features
   - `fix(cli): ...` for bug fixes
   - `chore(cli): ...` for maintenance

5. **Coordinate cross-package updates**
   - If SDK changes affect CLI, update both
   - Push and publish SDK before CLI

## Summary

| Action | Location | Command |
|--------|----------|---------|
| **Development** | Monorepo | `cd /Users/home/projects/GhostSpeak` |
| **Testing** | Monorepo | `bun test` |
| **Building** | Monorepo | `bun run build:cli` |
| **Version Bump** | Monorepo | Edit `packages/cli/package.json` |
| **Push to Package Repo** | Monorepo | `git subtree push --prefix=packages/cli cli-remote main` |
| **NPM Publishing** | Package Repo | `npm publish --access public` |

---

**Questions?** Check existing commits in both the monorepo and package repos for examples.
