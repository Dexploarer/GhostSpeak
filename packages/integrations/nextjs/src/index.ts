/**
 * GhostSpeak Next.js Integration
 * 
 * Provides Next.js-specific utilities, API routes, middleware,
 * and optimizations for GhostSpeak Protocol integration.
 */

export * from './components/GhostSpeakApp';
export * from './api/handlers';
export * from './middleware/ghostspeak';
export * from './hooks/useSSR';
export * from './utils/server';
export * from './types';

// Re-export React components and hooks
export * from '@ghostspeak/react';