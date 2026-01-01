# Modern TypeScript Tooling

## Table of Contents
- [Runtime Comparison](#runtime-comparison)
- [Node.js 22+ Native TypeScript](#nodejs-22-native-typescript)
- [Bun](#bun)
- [tsx](#tsx)
- [Build Tools](#build-tools)
- [Development Workflow](#development-workflow)

---

## Runtime Comparison

### Feature Matrix

| Feature | Node 22+ | Bun | Deno | tsx |
|---------|----------|-----|------|-----|
| Native TS | ✅ Strip | ✅ Full | ✅ Full | ✅ esbuild |
| Type-checking | ❌ | ❌ | ❌ | ❌ |
| Package manager | npm | bun | deno | npm |
| Test runner | ❌ | ✅ | ✅ | ❌ |
| Bundler | ❌ | ✅ | ❌ | ❌ |
| npm compat | 100% | ~98% | ~90% | 100% |
| Relative speed | 1x | 3x | ~1x | 1.5x |

### When to Use Each

**Node.js 22+**
- Production deployments
- Maximum npm compatibility
- Existing Node infrastructure

**Bun**
- New projects
- Development speed priority
- All-in-one toolkit

**tsx**
- Quick scripts
- Existing Node projects
- Gradual migration

---

## Node.js 22+ Native TypeScript

### Enable Type Stripping

```bash
# Stable in Node 22.6.0+
node --experimental-strip-types app.ts

# Or set via environment
NODE_OPTIONS="--experimental-strip-types" node app.ts
```

### Limitations

**Not Supported (runtime features):**
- Enums with computed values
- `namespace` with runtime code
- Parameter properties (`constructor(public x)`)
- Legacy decorators
- Triple-slash directives

**Solution:** Use `--erasableSyntaxOnly` in tsconfig:

```json
{
  "compilerOptions": {
    "erasableSyntaxOnly": true
  }
}
```

### Import Extensions

TypeScript imports need `.ts` extension for direct execution:

```typescript
// Must use .ts extension
import { helper } from './utils.ts';
```

With `--rewriteRelativeImportExtensions`, tsc converts to `.js` on build.

### package.json Setup

```json
{
  "type": "module",
  "scripts": {
    "start": "node --experimental-strip-types src/index.ts",
    "build": "tsc"
  }
}
```

---

## Bun

### Installation

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via npm)
npm install -g bun
```

### Zero-Config TypeScript

```bash
# Just run it
bun app.ts

# Watch mode
bun --watch app.ts

# Hot reload
bun --hot app.ts
```

### Bun as Package Manager

```bash
# Install (5-10x faster than npm)
bun install

# Add dependency
bun add zod

# Dev dependency
bun add -d typescript

# Run scripts
bun run build
```

### Bun Test Runner

```typescript
// app.test.ts
import { describe, expect, it } from 'bun:test';

describe('math', () => {
  it('adds numbers', () => {
    expect(1 + 1).toBe(2);
  });
});
```

```bash
bun test
```

Jest-compatible API, 10x faster.

### Bun Bundler

```bash
# Basic bundle
bun build ./src/index.ts --outdir ./dist

# For Node.js
bun build ./src/index.ts --outdir ./dist --target node

# With minification
bun build ./src/index.ts --outdir ./dist --minify

# Single executable
bun build ./src/cli.ts --compile --outfile mycli
```

### Bun + TypeScript Config

```json
// tsconfig.json (Bun-optimized)
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "module": "ESNext",
    "target": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "noEmit": true
  }
}
```

```bash
bun add -d bun-types
```

---

## tsx

### Installation

```bash
npm install -g tsx
# or
npx tsx app.ts
```

### Usage

```bash
# Run file
tsx app.ts

# Watch mode
tsx watch app.ts

# REPL
tsx
```

### Why tsx Over ts-node

| Feature | tsx | ts-node |
|---------|-----|---------|
| Startup time | ~100ms | ~2s |
| ESM support | Native | Complex setup |
| Config needed | None | tsconfig path |
| Engine | esbuild | tsc |

### With Existing Node Projects

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js"
  }
}
```

---

## Build Tools

### tsup (Recommended for Libraries)

Fast, zero-config bundler for TypeScript:

```bash
npm install -D tsup
```

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  splitting: false,
  treeshake: true,
});
```

```bash
# Build
tsup

# Watch
tsup --watch
```

### bunup (Fastest)

Bun-native bundler, sub-100ms builds:

```bash
bun add -d bunup
```

```bash
# Build (37ms typical)
bunup src/index.ts

# With options
bunup src/index.ts --format esm,cjs --dts
```

### tshy (Dual Publishing)

High-level tool for ESM/CJS dual publishing:

```bash
npm install -D tshy
```

```json
// package.json
{
  "tshy": {
    "exports": {
      "./package.json": "./package.json",
      ".": "./src/index.ts"
    }
  }
}
```

```bash
npx tshy
```

### Build Tool Comparison

| Tool | Speed | Config | Use Case |
|------|-------|--------|----------|
| **tsup** | Fast | Minimal | Libraries |
| **bunup** | Fastest | None | Bun projects |
| **tshy** | Medium | Auto | Dual ESM/CJS |
| **tsc** | Slow | Standard | Type-checking |
| **esbuild** | Fast | Manual | Custom builds |

---

## Development Workflow

### Recommended Stack (New Projects)

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "tsup",
    "test": "bun test",
    "lint": "biome check .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.0.0",
    "bun-types": "latest",
    "tsup": "^8.0.0",
    "typescript": "^5.9.0"
  }
}
```

### Recommended Stack (Node Projects)

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup",
    "start": "node dist/index.js",
    "test": "vitest",
    "lint": "oxlint",
    "typecheck": "tsc --noEmit"
  }
}
```

### CI/CD Optimization

```yaml
# GitHub Actions
- name: Setup Bun
  uses: oven-sh/setup-bun@v2

- name: Install
  run: bun install --frozen-lockfile

- name: Lint (fast)
  run: bunx oxlint

- name: Type Check
  run: bun run typecheck

- name: Test
  run: bun test

- name: Build
  run: bun run build
```

### Monorepo Tooling

For Turborepo or Nx with TypeScript:

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

Use `--filter` for targeted builds:

```bash
turbo build --filter=@myorg/core
```
