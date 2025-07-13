# GhostSpeak Next.js Integration Examples

This directory contains examples demonstrating how to use GhostSpeak with Next.js applications.

## Getting Started

### Installation

```bash
npm install @ghostspeak/nextjs @ghostspeak/react @ghostspeak/sdk
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
npm install @solana/wallet-adapter-wallets @solana/wallet-adapter-base
```

### Configuration

1. **Environment Variables** (`.env.local`):
```env
NEXT_PUBLIC_GHOSTSPEAK_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID=367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK

# Server-side (for API routes)
SOLANA_RPC_URL=https://api.devnet.solana.com
MARKETPLACE_PROGRAM_ID=367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK
```

2. **Next.js Configuration** (`next.config.js`):
```js
const withGhostSpeak = require('@ghostspeak/nextjs/plugin');

module.exports = withGhostSpeak({
  // Your Next.js config
});
```

3. **App Setup** (`pages/_app.tsx`):
```tsx
import { GhostSpeakApp } from '@ghostspeak/nextjs';

export default function App({ Component, pageProps }) {
  return (
    <GhostSpeakApp network="devnet" autoConnect>
      <Component {...pageProps} />
    </GhostSpeakApp>
  );
}
```

## Features

### Client-Side Features

- **Pre-configured Providers**: Automatic setup of wallet and GhostSpeak providers
- **React Hooks**: Access to all GhostSpeak React hooks
- **Component Library**: Pre-built components optimized for Next.js
- **TypeScript Support**: Full type safety throughout

### Server-Side Features

- **API Route Handlers**: Pre-built handlers for common operations
- **Authentication Middleware**: JWT and wallet-based authentication
- **Rate Limiting**: Built-in rate limiting for API protection
- **Server-Side Rendering**: SSR support with hydration handling

### Build Optimizations

- **Tree Shaking**: Optimized bundle size with Web3.js v2
- **Code Splitting**: Automatic code splitting for better performance
- **Webpack Configuration**: Optimized webpack config for Solana dependencies

## Examples Included

1. **Basic App Setup** (`_app.tsx`) - Shows how to configure the app wrapper
2. **Agents Page** (`agents.tsx`) - Demonstrates SSR with client-side interactions
3. **API Routes** (`api/agents.ts`) - Server-side API handling with middleware
4. **Configuration** (`next.config.js`) - Webpack optimization setup

## Usage Patterns

### Client-Side Agent Management
```tsx
import { useAgent, AgentCard } from '@ghostspeak/react';

function AgentsPage() {
  const { agents, createAgent, loading } = useAgent();
  
  return (
    <div>
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
```

### Server-Side API Routes
```tsx
import { createAgentHandler } from '@ghostspeak/nextjs/api';

const handler = createAgentHandler({
  network: 'devnet',
  rpcUrl: process.env.SOLANA_RPC_URL
});

export default handler;
```

### SSR with GhostSpeak Data
```tsx
export const getServerSideProps = async () => {
  // Server-side data fetching
  const client = createServerClient(config);
  const agents = await client.agents.list();
  
  return { props: { agents } };
};
```

## Performance Considerations

- **Bundle Size**: The integration is optimized for minimal bundle impact
- **SSR Hydration**: Proper handling of wallet state during SSR
- **Web3.js v2**: Uses the latest Web3.js for optimal performance
- **Lazy Loading**: Components are lazy-loaded where appropriate

## TypeScript Support

All examples include full TypeScript support with proper type definitions for:
- GhostSpeak SDK types
- Next.js page props
- API route handlers
- React component props