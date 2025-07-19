/// <reference types="node" />

declare global {
  // Ensure fetch is available in Node.js context
  const fetch: typeof globalThis.fetch;
  
  // Ensure URL constructor is available
  const URL: typeof globalThis.URL;
  
  // Ensure crypto.subtle is available
  interface Crypto {
    subtle: SubtleCrypto;
  }
  
  // Ensure console is properly typed
  const console: Console;
  
  // AbortSignal for fetch operations
  const AbortSignal: typeof globalThis.AbortSignal;
  const AbortController: typeof globalThis.AbortController;
  
  // Node.js specific globals
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: string;
      SOLANA_RPC_URL?: string;
      GHOSTSPEAK_PROGRAM_ID?: string;
    }
  }
}

export {}