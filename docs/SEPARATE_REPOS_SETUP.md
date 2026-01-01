# Separate Repositories Setup

The GhostSpeak monorepo maintains three packages as **both** monorepo packages and standalone GitHub repositories:

1. **SDK** (`packages/sdk-typescript`) → https://github.com/Ghostspeak/sdk
2. **CLI** (`packages/cli`) → https://github.com/Ghostspeak/cli
3. **Plugin** (`plugin-ghostspeak`) → https://github.com/Ghostspeak/plugin-ghostspeak

This is achieved using **git subtree**, which allows us to push subdirectories to their own remote repositories while keeping them in the monorepo.

## 🏗️ Architecture

```
GhostSpeak/ (monorepo)
├── packages/
│   ├── sdk-typescript/    ← Synced to github.com/Ghostspeak/sdk
│   ├── cli/               ← Synced to github.com/Ghostspeak/cli
│   └── web/               (monorepo only)
└── plugin-ghostspeak/     ← Synced to github.com/Ghostspeak/plugin-ghostspeak
```

## 🎯 Why Separate Repos?

### Benefits for Development (Monorepo)
- ✅ Shared dependencies
- ✅ Cross-package imports and testing
- ✅ Unified versioning
- ✅ Single source of truth

### Benefits for Publishing (Separate Repos)
- ✅ Clean standalone repositories
- ✅ Independent discoverability
- ✅ Easier for external contributors
- ✅ Package-specific issues/PRs
- ✅ Better npm/GitHub SEO

## 🔄 Syncing Repositories

### Sync All Packages

```bash
# From the GhostSpeak monorepo root
bash scripts/sync-all-repos.sh
```

This syncs SDK, CLI, and Plugin to their respective repositories.

### Sync Specific Package(s)

```bash
# Sync only SDK
bash scripts/sync-all-repos.sh sdk

# Sync only CLI
bash scripts/sync-all-repos.sh cli

# Sync only Plugin
bash scripts/sync-all-repos.sh plugin

# Sync multiple specific packages
bash scripts/sync-all-repos.sh sdk cli
```

### Manual Sync (if needed)

```bash
# SDK
git subtree push --prefix=packages/sdk-typescript sdk-remote main

# CLI
git subtree push --prefix=packages/cli cli-remote main

# Plugin
git subtree push --prefix=plugin-ghostspeak plugin-remote main
```

## 📦 Repository Details

### 1. SDK (@ghostspeak/sdk)

**Monorepo Path**: `packages/sdk-typescript`
**GitHub**: https://github.com/Ghostspeak/sdk
**npm**: https://www.npmjs.com/package/@ghostspeak/sdk
**Version**: 2.0.7

**Description**: TypeScript SDK for GhostSpeak AI Agent Commerce Protocol

**Key Features**:
- Agent management
- Credential issuance
- Escrow operations
- Token-2022 support
- PayAI integration
- Crossmint bridge

### 2. CLI (@ghostspeak/cli)

**Monorepo Path**: `packages/cli`
**GitHub**: https://github.com/Ghostspeak/cli
**npm**: https://www.npmjs.com/package/@ghostspeak/cli
**Version**: 2.0.0-beta.19

**Description**: Command-line interface for GhostSpeak

**Key Features**:
- Agent registration
- Credential issuance
- Wallet management
- Escrow operations
- Reputation tracking
- Interactive TUI

**Binaries**:
- `ghostspeak` - Full command
- `ghost` - Short alias

### 3. Plugin (@ghostspeak/plugin-elizaos)

**Monorepo Path**: `plugin-ghostspeak`
**GitHub**: https://github.com/Ghostspeak/plugin-ghostspeak
**npm**: https://www.npmjs.com/package/@ghostspeak/plugin-elizaos
**Version**: 0.1.0

**Description**: ElizaOS plugin for GhostSpeak (Caisper)

**Key Features**:
- Ghost Score checking
- Agent registration
- Credential issuance
- PayAI integration
- Crossmint bridge
- Wallet management

## 🚀 Publishing Workflow

### 1. Develop in Monorepo

```bash
# Work on SDK
cd packages/sdk-typescript
bun run dev

# Work on CLI
cd packages/cli
bun run dev

# Work on Plugin
cd plugin-ghostspeak
elizaos dev
```

### 2. Test Changes

```bash
# SDK
cd packages/sdk-typescript
bun test
bun run build

# CLI
cd packages/cli
bun test
bun run build

# Plugin
cd plugin-ghostspeak
bun test
bun run build
```

### 3. Commit to Monorepo

```bash
git add .
git commit -m "feat: your feature description"
git push origin main
```

### 4. Sync to Separate Repos

```bash
# Sync all
bash scripts/sync-all-repos.sh

# Or sync specific package
bash scripts/sync-all-repos.sh sdk
bash scripts/sync-all-repos.sh cli
bash scripts/sync-all-repos.sh plugin
```

### 5. Publish to npm

#### SDK

```bash
cd packages/sdk-typescript
npm version patch  # or minor/major
npm publish
git push origin main --tags
```

#### CLI

```bash
cd packages/cli
npm version patch  # or minor/major
npm publish
git push origin main --tags
```

#### Plugin

**⚠️ Important**: The plugin uses `@ghostspeak/sdk` as a workspace dependency. Before publishing, you need to replace it with the actual published version.

```bash
cd plugin-ghostspeak

# Option 1: Manual edit
# Edit package.json to change:
#   "@ghostspeak/sdk": "workspace:*"
# to:
#   "@ghostspeak/sdk": "^2.0.7"  (or latest version)

# Option 2: Use automated script (recommended)
# See PLUGIN_REPO_SETUP.md for script

npm version patch  # or minor/major
npm publish
git push origin main --tags
```

## 🔧 Remote Configuration

The sync script automatically manages these remotes:

```bash
# View all remotes
git remote -v

# Expected remotes:
# origin          https://github.com/Ghostspeak/GhostSpeak.git (monorepo)
# sdk-remote      https://github.com/Ghostspeak/sdk.git
# cli-remote      https://github.com/Ghostspeak/cli.git
# plugin-remote   https://github.com/Ghostspeak/plugin-ghostspeak.git
```

### Manual Remote Setup (if needed)

```bash
# Add SDK remote
git remote add sdk-remote https://github.com/Ghostspeak/sdk.git

# Add CLI remote
git remote add cli-remote https://github.com/Ghostspeak/cli.git

# Add Plugin remote
git remote add plugin-remote https://github.com/Ghostspeak/plugin-ghostspeak.git
```

## 📝 Package Dependencies

### SDK → No internal dependencies
The SDK is standalone and doesn't depend on other GhostSpeak packages.

### CLI → Depends on SDK
```json
{
  "dependencies": {
    "@ghostspeak/sdk": "^2.0.5"
  }
}
```

**Publishing Order**: Always publish SDK before CLI.

### Plugin → Depends on SDK
```json
{
  "dependencies": {
    "@ghostspeak/sdk": "workspace:*"  // In monorepo
    // "@ghostspeak/sdk": "^2.0.7"    // For npm publishing
  }
}
```

**Publishing Order**: Always publish SDK before Plugin.

## 🔄 Update Workflow Example

Let's say you're adding a new feature to the SDK that the CLI will use:

### Step 1: Update SDK

```bash
cd packages/sdk-typescript
# Make changes...
bun test
bun run build
git add .
git commit -m "feat(sdk): add new agent method"
```

### Step 2: Update CLI to use new SDK feature

```bash
cd packages/cli
# Update CLI code to use new SDK feature
# (Uses SDK via workspace dependency, so changes are immediately available)
bun test
git add .
git commit -m "feat(cli): use new SDK agent method"
```

### Step 3: Push to monorepo

```bash
git push origin main
```

### Step 4: Sync both to separate repos

```bash
bash scripts/sync-all-repos.sh sdk cli
```

### Step 5: Publish SDK first

```bash
cd packages/sdk-typescript
npm version minor  # e.g., 2.0.7 → 2.1.0
npm publish
git push origin main --tags
```

### Step 6: Update CLI dependency and publish

```bash
cd packages/cli
# Update package.json: "@ghostspeak/sdk": "^2.1.0"
npm version minor  # e.g., 2.0.0-beta.19 → 2.0.0-beta.20
npm publish
git push origin main --tags
```

## 🆘 Troubleshooting

### "Uncommitted changes" error

```bash
# Commit or stash your changes first
git add <package-directory>
git commit -m "your message"

# Then try syncing again
bash scripts/sync-all-repos.sh
```

### Merge conflicts in separate repo

If the separate repo has changes that conflict:

```bash
# Option 1: Force push (overwrites separate repo)
git subtree push --prefix=<directory> <remote> main --force

# Option 2: Pull changes from separate repo first
# (More complex, usually not needed)
```

### Remote not found error

```bash
# Add the missing remote
git remote add sdk-remote https://github.com/Ghostspeak/sdk.git
git remote add cli-remote https://github.com/Ghostspeak/cli.git
git remote add plugin-remote https://github.com/Ghostspeak/plugin-ghostspeak.git
```

## 📊 Repository Status

| Package | Monorepo Path | GitHub Repo | npm Package | Status |
|---------|---------------|-------------|-------------|--------|
| **SDK** | `packages/sdk-typescript` | [Ghostspeak/sdk](https://github.com/Ghostspeak/sdk) | [@ghostspeak/sdk](https://www.npmjs.com/package/@ghostspeak/sdk) | ✅ Published |
| **CLI** | `packages/cli` | [Ghostspeak/cli](https://github.com/Ghostspeak/cli) | [@ghostspeak/cli](https://www.npmjs.com/package/@ghostspeak/cli) | ✅ Published |
| **Plugin** | `plugin-ghostspeak` | [Ghostspeak/plugin-ghostspeak](https://github.com/Ghostspeak/plugin-ghostspeak) | [@ghostspeak/plugin-elizaos](https://www.npmjs.com/package/@ghostspeak/plugin-elizaos) | 🚧 Ready to publish |

## 🔗 Links

- **Monorepo**: https://github.com/Ghostspeak/GhostSpeak
- **SDK Repo**: https://github.com/Ghostspeak/sdk
- **CLI Repo**: https://github.com/Ghostspeak/cli
- **Plugin Repo**: https://github.com/Ghostspeak/plugin-ghostspeak
- **Website**: https://ghostspeak.io
- **Documentation**: https://ghostspeak.io/docs

## 📚 Further Reading

- [Git Subtree Guide](https://www.atlassian.com/git/tutorials/git-subtree)
- [Monorepo Patterns](https://monorepo.tools/)
- [npm Publishing Best Practices](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
