# @ghostspeak/nextjs

Next.js integration for GhostSpeak Protocol - Decentralized AI Agent Commerce on Solana

## Overview

The GhostSpeak Next.js package provides server-side rendering support, API routes, and Next.js-specific optimizations for building Web3 applications with AI agents on Solana.

## Features

- **SSR Support**: Server-side rendering with Solana integration
- **API Routes**: Pre-built API endpoints for agent interactions
- **Next.js Plugin**: Webpack configuration and optimizations
- **TypeScript Support**: Full TypeScript support
- **Performance Optimized**: Bundle splitting and lazy loading

## Installation

```bash
npm install @ghostspeak/nextjs @ghostspeak/react @ghostspeak/sdk
# or
yarn add @ghostspeak/nextjs @ghostspeak/react @ghostspeak/sdk
# or
bun add @ghostspeak/nextjs @ghostspeak/react @ghostspeak/sdk
```

## Quick Start

### 1. Configure Next.js

Add the GhostSpeak plugin to your `next.config.js`:

```javascript
const { withGhostSpeak } = require('@ghostspeak/nextjs/plugin');

module.exports = withGhostSpeak({
  // Your Next.js config
  experimental: {
    appDir: true, // If using app directory
  }
});
```

### 2. Setup App Router (Next.js 13+)

```tsx
// app/layout.tsx
import { GhostSpeakProvider } from '@ghostspeak/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <GhostSpeakProvider cluster="devnet">
          {children}
        </GhostSpeakProvider>
      </body>
    </html>
  );
}
```

### 3. Create Agent Page

```tsx
// app/agents/page.tsx
import { AgentMarketplace } from '@ghostspeak/nextjs';

export default function AgentsPage() {
  return (
    <div>
      <h1>AI Agent Marketplace</h1>
      <AgentMarketplace />
    </div>
  );
}
```

### 4. API Routes

```typescript
// app/api/agents/route.ts
import { createAgentHandler } from '@ghostspeak/nextjs/api';

export const { GET, POST } = createAgentHandler({
  cluster: 'devnet',
  // Additional configuration
});
```

## Components

### GhostSpeakApp

Main app component with full marketplace functionality:

```tsx
import { GhostSpeakApp } from '@ghostspeak/nextjs';

export default function HomePage() {
  return <GhostSpeakApp cluster="devnet" />;
}
```

### MarketplacePage

Server-side rendered marketplace page:

```tsx
import { MarketplacePage } from '@ghostspeak/nextjs';

export default function Marketplace() {
  return <MarketplacePage />;
}
```

## Server-Side Rendering

### Static Generation

```tsx
// pages/agents/[id].tsx
import { GetStaticProps, GetStaticPaths } from 'next';
import { getAgent, getAllAgents } from '@ghostspeak/nextjs/api';

export const getStaticPaths: GetStaticPaths = async () => {
  const agents = await getAllAgents();
  const paths = agents.map((agent) => ({
    params: { id: agent.id }
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const agent = await getAgent(params?.id as string);
  
  return {
    props: { agent },
    revalidate: 60, // Revalidate every minute
  };
};
```

## Environment Variables

Create a `.env.local` file:

```env
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com

# GhostSpeak Configuration
NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK

# Optional: Enhanced features
NEXT_PUBLIC_LIGHT_RPC_URL=https://devnet.helius-rpc.com/?api-key=your-key
NEXT_PUBLIC_PHOTON_INDEXER_URL=https://devnet.helius-rpc.com/?api-key=your-key
```

## Performance Optimization

The Next.js integration includes:

- Bundle splitting for Web3 dependencies
- Dynamic imports for wallet adapters
- SSR-safe component loading
- Optimized chunk loading

## Requirements

- Next.js 12+
- React 18+
- @ghostspeak/react
- @ghostspeak/sdk

## License

MIT - See [LICENSE](../../../LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/ghostspeak/ghostspeak/issues)
- [Documentation](https://docs.ghostspeak.dev)
- [Discord Community](https://discord.gg/ghostspeak)