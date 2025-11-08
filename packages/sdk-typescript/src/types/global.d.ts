/// <reference types="node" />
/// <reference lib="dom" />

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

  // Browser-specific types that may not be available in Node.js
  interface Window {
    crypto: Crypto;
  }

  // BlobPart type for IPFS file handling
  type BlobPart = BufferSource | Blob | string;

  // WebAssembly types
  namespace WebAssembly {
    class Instance {
      exports: Record<string, unknown>;
    }
    class Module {}
    function instantiate(
      bufferSource: BufferSource,
      importObject?: Record<string, unknown>
    ): Promise<{ instance: Instance; module: Module }>;
  }

  // Worker types for browser
  interface WorkerOptions {
    type?: 'classic' | 'module';
    credentials?: 'omit' | 'same-origin' | 'include';
    name?: string;
  }

  interface Worker {
    postMessage(message: unknown): void;
    terminate(): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }

  const Worker: {
    prototype: Worker;
    new(scriptURL: string | URL, options?: WorkerOptions): Worker;
  };

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