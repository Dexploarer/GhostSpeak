---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Solana Packages

**IMPORTANT: Legacy @solana/web3.js and @solana/spl-token are BANNED in this codebase**

As of December 2025, this project has migrated to Solana Web3.js v5 (modular architecture).

### DO NOT USE (Deprecated):
- ❌ `@solana/web3.js` - Legacy monolithic package (maintenance mode, use @solana/rpc instead)
- ❌ `@solana/spl-token` - Legacy SPL token client (v1.x only, use @solana-program/token instead)

### USE INSTEAD (Modern v5):
- ✅ `@solana/rpc` - For RPC connections and calls
- ✅ `@solana/addresses` - For address handling
- ✅ `@solana/signers` - For transaction signing
- ✅ `@solana/kit` - All-in-one modern Solana package
- ✅ `@solana-program/token` - For standard SPL tokens (v2+ compatible)
- ✅ `@solana-program/token-2022` - For Token-2022 extensions (optional)
- ✅ `@solana-program/system` - For system program instructions

### Migration Patterns:

**Connection → RPC:**
```typescript
// ❌ OLD (deprecated)
import { Connection } from '@solana/web3.js'
const connection = new Connection(url)
const blockhash = await connection.getLatestBlockhash()

// ✅ NEW (modern v5)
import { createSolanaRpc } from '@solana/rpc'
const rpc = createSolanaRpc(url)
const blockhash = await rpc.getLatestBlockhash().send()
```

**PublicKey → Address:**
```typescript
// ❌ OLD (deprecated)
import { PublicKey } from '@solana/web3.js'
const pubkey = new PublicKey(addressString)
const bytes = pubkey.toBytes()

// ✅ NEW (modern v5)
import { address } from '@solana/addresses'
import bs58 from 'bs58'
const addr = address(addressString)
const bytes = bs58.decode(addr) // When you need bytes
```

**Keypair → Signer:**
```typescript
// ❌ OLD (deprecated)
import { Keypair } from '@solana/web3.js'
const keypair = Keypair.generate()

// ✅ NEW (modern v5)
import { generateKeyPairSigner } from '@solana/signers'
const signer = await generateKeyPairSigner()
```

### Token Operations

For SPL token operations, use `@solana-program/token` with modern patterns:

```typescript
// ✅ CORRECT (modern v5)
import { getAccount, getAssociatedTokenAddressSync } from '@solana-program/token'
import { createSolanaRpc } from '@solana/rpc'
import { address } from '@solana/addresses'

const rpc = createSolanaRpc(url)
const mintAddress = address('BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh')
const ataAddress = getAssociatedTokenAddressSync({ mint: mintAddress, owner: ownerAddress })
```

**Note**: Some legacy files may still use dynamic imports of `@solana/web3.js` during the migration period. These should be updated to use the modern API.

### ESLint Enforcement

The ESLint config blocks legacy package imports:

```javascript
'no-restricted-imports': ['error', {
  paths: [
    {
      name: '@solana/web3.js',
      message: 'Use @solana/rpc, @solana/addresses, @solana/signers, or @solana/kit instead'
    },
    {
      name: '@solana/spl-token',
      message: 'Use @solana-program/token or @solana-program/token-2022 instead'
    }
  ]
}]
```

### Benefits of v5 Migration:
- ✅ Tree-shakable (smaller bundle sizes)
- ✅ Zero dependencies
- ✅ Better TypeScript support (branded types)
- ✅ Modern async/await patterns
- ✅ Version consistency across all @solana/* packages

### Documentation:
- Migration completed: December 30, 2025
- See `SOLANA_MIGRATION_COMPLETION.md` for full migration details
- All @solana/* packages synchronized at v5.1.0
