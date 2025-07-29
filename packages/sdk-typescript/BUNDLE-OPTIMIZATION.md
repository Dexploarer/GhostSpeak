# Bundle Optimization Guide

This document explains the bundle optimization features in the GhostSpeak SDK and how to achieve the smallest possible bundle size.

## 🎯 Optimization Features

### 1. Tree-shakeable Architecture
The SDK is designed with tree-shaking in mind:
- ✅ Individual exports for each function
- ✅ Separate entry points for different modules
- ✅ Minimal core bundle available
- ✅ External dependencies marked properly

### 2. Multiple Entry Points

```typescript
// Full SDK (largest)
import GhostSpeak from '@ghostspeak/sdk'

// Individual modules (medium)
import { GhostSpeakClient } from '@ghostspeak/sdk/client'
import { encrypt, decrypt } from '@ghostspeak/sdk/crypto'
import { deriveAgentPda } from '@ghostspeak/sdk/utils'
import type { Agent, Escrow } from '@ghostspeak/sdk/types'

// Minimal bundle (smallest)
import GhostSpeak from '@ghostspeak/sdk/minimal'
```

### 3. Bundle Analysis

```bash
# Analyze current bundle sizes
bun run build:analyze

# This will show:
# - Individual bundle sizes
# - Gzipped sizes
# - Tree-shaking recommendations
# - Import examples
```

## 📦 Bundle Size Comparison

| Import Method | Bundle Size* | Use Case |
|---------------|-------------|----------|
| Full SDK | ~150KB | Full-featured applications |
| Selective imports | ~50-80KB | Most applications |
| Minimal bundle | ~15KB | Basic agent operations only |
| Crypto only | ~25KB | Only ElGamal encryption |
| Utils only | ~10KB | Only utility functions |

*Gzipped sizes are approximate and may vary based on actual usage.

## 🌳 Tree-shaking Best Practices

### ✅ Do This (Optimal)

```typescript
// Import only what you need
import { GhostSpeakClient, sol } from '@ghostspeak/sdk'
import { encrypt, decrypt } from '@ghostspeak/sdk/crypto'
import type { Agent } from '@ghostspeak/sdk/types'

// Use minimal bundle for basic usage
import GhostSpeak from '@ghostspeak/sdk/minimal'

// Dynamic imports for rarely used features
const advancedFeatures = async () => {
  const { zkProofs } = await import('@ghostspeak/sdk/crypto')
  return zkProofs.generateProof(data)
}
```

### ❌ Avoid This (Bundle Bloat)

```typescript
// Importing everything
import * as GhostSpeak from '@ghostspeak/sdk'

// Unused bulk imports
import * as crypto from '@ghostspeak/sdk/crypto'
import * as utils from '@ghostspeak/sdk/utils'

// Full SDK when you only need basic features
import GhostSpeak from '@ghostspeak/sdk'
const client = new GhostSpeak() // but you only use basic agent operations
```

## 🎯 Bundle Size Optimization Strategies

### 1. Start with Minimal Bundle

```typescript
// For basic agent operations
import GhostSpeak from '@ghostspeak/sdk/minimal'

const ghostspeak = new GhostSpeak()
const agent = await ghostspeak.agent().create({ name: "Assistant" })
```

### 2. Add Features Incrementally

```typescript
// Add crypto when needed
import { encrypt, decrypt } from '@ghostspeak/sdk/crypto'

// Add specific utilities
import { deriveAgentPda, sol } from '@ghostspeak/sdk/utils'

// Add types for better DX
import type { Agent, Escrow } from '@ghostspeak/sdk/types'
```

### 3. Use Dynamic Imports for Advanced Features

```typescript
// Load heavy features only when needed
const useAdvancedFeatures = async () => {
  // These will be loaded as separate chunks
  const [
    { zkProofs },
    { ConfidentialTransferManager },
    { IPFSClient }
  ] = await Promise.all([
    import('@ghostspeak/sdk/crypto'),
    import('@ghostspeak/sdk/utils'),
    import('@ghostspeak/sdk/utils')
  ])
  
  // Use features...
}
```

## 📊 Bundle Analysis Output

Running `bun run build:analyze` shows:

```
📦 GhostSpeak SDK Bundle Analysis
════════════════════════════════════

📊 Bundle Sizes:
┌─────────────────────────┬──────────────┬──────────────┐
│ Bundle                  │ Raw Size     │ Gzipped      │
├─────────────────────────┼──────────────┼──────────────┤
│ index.js               │   450.2 KB   │   125.8 KB   │
│ client.js              │    85.3 KB   │    28.1 KB   │
│ crypto.js              │   120.7 KB   │    35.2 KB   │
│ utils.js               │    95.1 KB   │    22.4 KB   │
│ types.js               │     8.2 KB   │     2.1 KB   │
│ minimal/core-minimal.js│    45.6 KB   │    12.3 KB   │
└─────────────────────────┴──────────────┴──────────────┘

🌳 Tree-shakeable Import Examples:
   1. import GhostSpeak from '@ghostspeak/sdk'
   2. import { encrypt, decrypt } from '@ghostspeak/sdk/crypto'
   3. import GhostSpeak from '@ghostspeak/sdk/minimal'

💡 Bundle Optimization Recommendations:
   1. Use '@ghostspeak/sdk/minimal' for basic usage
   2. Import specific functions for better tree-shaking
   3. Consider code splitting for large applications
```

## 🏗️ Build Configuration

The SDK uses an optimized tsup configuration:

```typescript
// tsup.config.ts
export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      client: 'src/core/GhostSpeakClient.ts',
      types: 'src/core/types.ts',
      crypto: 'src/crypto/index.ts',
      utils: 'src/utils/index.ts'
    },
    splitting: true,      // Code splitting enabled
    treeshake: true,      // Tree-shaking enabled
    external: [...],      // External dependencies
    metafile: true        // Bundle analysis data
  }
])
```

## 🎯 Framework-Specific Tips

### Next.js
```typescript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['@ghostspeak/sdk']
  }
}
```

### Vite
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['@solana/kit'] // Keep Solana as external
    }
  }
})
```

### Webpack
```typescript
// webpack.config.js
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: false
  }
}
```

## 📈 Monitoring Bundle Size

1. **CI/CD Integration**: Add bundle analysis to your CI pipeline
2. **Bundle Size Limits**: Set limits for different import methods
3. **Regular Analysis**: Run analysis after major changes

```bash
# In your CI pipeline
bun run build:analyze
if [ bundle_size -gt 200000 ]; then
  echo "Bundle size exceeded limit"
  exit 1
fi
```

## 🔧 Troubleshooting

### "Bundle is larger than expected"
- Check if you're importing the full SDK instead of specific modules
- Use dynamic imports for advanced features
- Consider the minimal bundle for basic usage

### "Tree-shaking not working"
- Ensure your bundler supports ES modules
- Check that you're not using `import *` statements
- Verify external dependencies are marked correctly

### "Missing exports"
- Check if you need to import from a specific entry point
- Some advanced features may require the full SDK import

## 📚 Related Documentation

- [Examples](./examples/README.md) - Usage examples with optimal imports
- [API Reference](./docs/api.md) - Complete API documentation
- [Migration Guide](./MIGRATION.md) - Upgrading from previous versions