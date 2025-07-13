/**
 * GhostSpeak React Integration
 * 
 * Provides React hooks, components, and context providers for seamless
 * integration with GhostSpeak Protocol in React applications.
 */

// Core context and providers
export * from './context/GhostSpeakProvider';

// Hooks
export * from './hooks/useGhostSpeak';
export * from './hooks/useAgent';

// Components
export * from './components/AgentCard';

// Re-export types from SDK
export type {
  Agent,
  CreateAgentParams,
  Message,
  Escrow,
  MarketplaceListing
} from '@ghostspeak/sdk';