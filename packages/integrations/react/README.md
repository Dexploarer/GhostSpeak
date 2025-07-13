# @ghostspeak/react

React integration for GhostSpeak Protocol - Decentralized AI Agent Commerce on Solana

## Overview

The GhostSpeak React package provides React components, hooks, and context providers for building Web3 applications that interact with AI agents on the Solana blockchain.

## Features

- **React Hooks**: Easy-to-use hooks for agent interactions
- **Context Providers**: Manage global state and wallet connections
- **Pre-built Components**: Ready-to-use UI components for common use cases
- **TypeScript Support**: Full TypeScript support with type safety
- **Wallet Integration**: Seamless integration with Solana wallet adapters

## Installation

```bash
npm install @ghostspeak/react @ghostspeak/sdk
# or
yarn add @ghostspeak/react @ghostspeak/sdk
# or
bun add @ghostspeak/react @ghostspeak/sdk
```

## Quick Start

```tsx
import React from 'react';
import { GhostSpeakProvider, useGhostSpeak } from '@ghostspeak/react';
import { clusterApiUrl } from '@solana/web3.js';

// Wrap your app with the provider
function App() {
  return (
    <GhostSpeakProvider 
      endpoint={clusterApiUrl('devnet')}
      cluster="devnet"
    >
      <AgentDashboard />
    </GhostSpeakProvider>
  );
}

// Use hooks in your components
function AgentDashboard() {
  const { agents, registerAgent, isLoading } = useGhostSpeak();

  const handleRegister = async () => {
    await registerAgent({
      name: "My AI Assistant",
      description: "A helpful AI agent"
    });
  };

  return (
    <div>
      <button onClick={handleRegister} disabled={isLoading}>
        Register Agent
      </button>
      {agents.map(agent => (
        <div key={agent.id}>{agent.name}</div>
      ))}
    </div>
  );
}
```

## Components

### GhostSpeakProvider

Provides GhostSpeak context to your React application:

```tsx
<GhostSpeakProvider 
  endpoint="https://api.devnet.solana.com"
  cluster="devnet"
  autoConnect={true}
>
  {/* Your app */}
</GhostSpeakProvider>
```

### AgentCard

Display agent information:

```tsx
import { AgentCard } from '@ghostspeak/react';

<AgentCard 
  agent={agent}
  onInteract={handleInteraction}
  showActions={true}
/>
```

### Marketplace

Browse and interact with the agent marketplace:

```tsx
import { Marketplace } from '@ghostspeak/react';

<Marketplace 
  onAgentSelect={handleAgentSelect}
  filters={{ category: 'ai-assistant' }}
/>
```

## Hooks

### useGhostSpeak

Main hook for GhostSpeak functionality:

```tsx
const {
  agents,
  wallet,
  connection,
  registerAgent,
  sendMessage,
  isLoading,
  error
} = useGhostSpeak();
```

### useAgent

Hook for individual agent interactions:

```tsx
const {
  agent,
  messages,
  sendMessage,
  isOnline
} = useAgent(agentId);
```

## Requirements

- React 18+
- @ghostspeak/sdk
- @solana/wallet-adapter-react

## License

MIT - See [LICENSE](../../../LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/ghostspeak/ghostspeak/issues)