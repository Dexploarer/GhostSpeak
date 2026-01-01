/**
 * Zustand SDK Store
 *
 * Single source of truth for GhostSpeak SDK client singleton.
 * Syncs with auth store for wallet connection status.
 *
 * Features:
 * - Client singleton management
 * - Redux DevTools integration
 * - Optimized selectors
 * - Network configuration
 */

'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  createGhostSpeakClient,
  type GhostSpeakClient,
  type NetworkType,
} from '../ghostspeak/client'

/**
 * SDK Store State
 */
interface SDKState {
  // Client singleton
  client: GhostSpeakClient | null

  // Network configuration
  network: NetworkType
  customRpcUrl: string | null

  // Wallet connection status (synced from auth store)
  isConnected: boolean
  publicKey: string | null

  // Initialization state
  isInitialized: boolean
}

/**
 * SDK Store Actions
 */
interface SDKActions {
  /**
   * Initialize SDK client with network configuration
   */
  initialize: (network?: NetworkType, customRpcUrl?: string) => void

  /**
   * Update wallet connection status (called by sync engine)
   */
  updateConnectionStatus: (isConnected: boolean, publicKey: string | null) => void

  /**
   * Reset store to initial state
   */
  reset: () => void
}

export type SDKStore = SDKState & SDKActions

/**
 * Initial state
 */
const initialState: SDKState = {
  client: null,
  network: 'devnet',
  customRpcUrl: null,
  isConnected: false,
  publicKey: null,
  isInitialized: false,
}

/**
 * Create Zustand Store
 */
export const useSDKStore = create<SDKStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Initialize SDK client with network configuration
       */
      initialize: (network = 'devnet', customRpcUrl) => {
        const currentState = get()

        // Normalize customRpcUrl to match storage normalization (undefined -> null)
        const normalizedRpcUrl = customRpcUrl ?? null

        // Skip if already initialized with same config
        if (
          currentState.isInitialized &&
          currentState.network === network &&
          currentState.customRpcUrl === normalizedRpcUrl
        ) {
          return
        }

        // Create client singleton (cached internally)
        const client = createGhostSpeakClient(network, customRpcUrl)

        set({
          client,
          network,
          customRpcUrl: normalizedRpcUrl,
          isInitialized: true,
        })

        if (process.env.NODE_ENV === 'development') {
          console.log('[SDK Store] Initialized:', { network, customRpcUrl, hasClient: !!client })
        }
      },

      /**
       * Update wallet connection status
       * Called by sync engine when auth state changes
       */
      updateConnectionStatus: (isConnected, publicKey) => {
        const currentState = get()

        // Only update if changed
        if (
          currentState.isConnected === isConnected &&
          currentState.publicKey === publicKey
        ) {
          return
        }

        set({
          isConnected,
          publicKey,
        })

        if (process.env.NODE_ENV === 'development') {
          console.log('[SDK Store] Connection status updated:', { isConnected, publicKey })
        }
      },

      /**
       * Reset store to initial state
       */
      reset: () => {
        console.log('[SDK Store] Resetting to initial state')
        set(initialState)
      },
    }),
    {
      name: 'GhostSpeak SDK',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

/**
 * Optimized selectors to prevent unnecessary re-renders
 */

// Client selector
export const useSDKClient = () => useSDKStore((state) => state.client)

// Network selectors
export const useSDKNetwork = () => useSDKStore((state) => state.network)

// Connection selectors
export const useSDKIsConnected = () => useSDKStore((state) => state.isConnected)
export const useSDKPublicKey = () => useSDKStore((state) => state.publicKey)

// Initialization selector
export const useSDKIsInitialized = () => useSDKStore((state) => state.isInitialized)
