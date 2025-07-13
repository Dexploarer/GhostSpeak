# GhostSpeak React Integration Examples

This directory contains examples demonstrating how to use the GhostSpeak React integration package.

## Basic Usage Example

The `basic-usage.tsx` file shows how to:

1. Set up wallet connection with Solana wallet adapters
2. Initialize the GhostSpeak provider
3. Use hooks to fetch and display agents
4. Handle wallet connection states

### Installation

```bash
npm install @ghostspeak/react @ghostspeak/sdk
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
npm install @solana/wallet-adapter-wallets
```

### Usage

```tsx
import React from 'react';
import { 
  GhostSpeakProvider, 
  useGhostSpeak, 
  useAgent,
  AgentCard 
} from '@ghostspeak/react';

function MyApp() {
  return (
    <GhostSpeakProvider network="devnet" autoConnect>
      <MyComponent />
    </GhostSpeakProvider>
  );
}

function MyComponent() {
  const { connected } = useGhostSpeak();
  const { agents } = useAgent();
  
  return (
    <div>
      {connected && agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
```

## Features

- **Wallet Integration**: Seamless integration with Solana wallet adapters
- **React Hooks**: Easy-to-use hooks for agent management
- **Component Library**: Pre-built components for common UI patterns
- **TypeScript Support**: Full TypeScript support with type definitions
- **Web3.js v2**: Built on the latest Web3.js v2 for optimal performance

## API Reference

### Hooks

- `useGhostSpeak()` - Main hook for GhostSpeak client access
- `useAgent()` - Hook for agent management operations

### Components

- `GhostSpeakProvider` - Context provider for GhostSpeak state
- `AgentCard` - Display component for agent information

### Types

All types are re-exported from `@ghostspeak/sdk` for convenience.