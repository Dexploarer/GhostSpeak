'use client'

/**
 * GhostSpeak Zustand Store Hooks
 *
 * Provides hooks for accessing GhostSpeak SDK functionality
 * with Zustand state management (replacing React Context).
 *
 * Core Pillars:
 * - Identity Registry (Agents)
 * - Verifiable Credentials
 * - Reputation Layer
 */

import React, { useEffect, useCallback } from 'react'
import { useWallet } from '@crossmint/client-sdk-react-ui'
import type { GhostSpeakClient, NetworkType, Address } from '../ghostspeak/client'
import {
  useSDKStore,
  useSDKClient,
  useSDKNetwork,
  useSDKIsConnected,
  useSDKPublicKey,
} from '../stores/sdk.store'

// Re-export types
export type { GhostSpeakClient, NetworkType }

/**
 * GhostSpeak context value interface (for backwards compatibility)
 */
interface GhostSpeakContextValue {
  client: GhostSpeakClient | null
  isConnected: boolean
  publicKey: string | null
  network: NetworkType
}

/**
 * GhostSpeak provider props
 */
interface GhostSpeakProviderProps {
  children: React.ReactNode
  network?: NetworkType
  customRpcUrl?: string
}

/**
 * GhostSpeak provider component
 *
 * Initializes SDK store and syncs wallet connection status.
 * No longer uses React Context - uses Zustand store instead.
 */
export function GhostSpeakProvider({
  children,
  network = 'devnet',
  customRpcUrl,
}: GhostSpeakProviderProps) {
  const { wallet } = useWallet()
  const initialize = useSDKStore((state) => state.initialize)
  const updateConnectionStatus = useSDKStore((state) => state.updateConnectionStatus)

  // Initialize SDK client on mount
  useEffect(() => {
    initialize(network, customRpcUrl)
  }, [initialize, network, customRpcUrl])

  // Sync wallet connection status
  useEffect(() => {
    updateConnectionStatus(Boolean(wallet?.address), wallet?.address ?? null)
  }, [updateConnectionStatus, wallet?.address])

  return <>{children}</>
}

/**
 * Hook to access GhostSpeak SDK state
 * Maintains backwards compatibility with previous Context API
 */
export function useGhostSpeak(): GhostSpeakContextValue {
  const client = useSDKClient()
  const network = useSDKNetwork()
  const isConnected = useSDKIsConnected()
  const publicKey = useSDKPublicKey()

  return {
    client,
    isConnected,
    publicKey,
    network,
  }
}

/**
 * Hook to access GhostSpeak client
 * Optimized selector - directly accesses store
 */
export function useGhostSpeakClient(): GhostSpeakClient | null {
  return useSDKClient()
}

/**
 * Hook for agent operations (Identity Registry)
 */
export function useAgents() {
  const { client, publicKey, isConnected } = useGhostSpeak()

  const getAllAgents = useCallback(async () => {
    if (!client) return []
    return client.agents.getAllAgents()
  }, [client])

  const getUserAgents = useCallback(async () => {
    if (!client || !publicKey) return []
    return client.agents.getUserAgents(publicKey as Address)
  }, [client, publicKey])

  const getAgent = useCallback(
    async (address: string) => {
      if (!client) return null
      return client.agents.getAgentAccount(address as Address)
    },
    [client]
  )

  return {
    getAllAgents,
    getUserAgents,
    getAgent,
    isConnected,
    client: client?.agents ?? null,
  }
}

/**
 * Hook for credentials operations (Verifiable Credentials)
 */
export function useCredentials() {
  const { client, isConnected } = useGhostSpeak()

  return {
    client: client?.credentials ?? null,
    isConnected,
  }
}

/**
 * Hook for reputation operations (Reputation Layer)
 */
export function useReputation() {
  const { client, isConnected } = useGhostSpeak()

  return {
    client: client?.reputation ?? null,
    isConnected,
  }
}

/**
 * Hook for PayAI operations (Payment Events)
 */
export function usePayAI() {
  const { client, isConnected } = useGhostSpeak()

  return {
    client: client?.payai ?? null,
    isConnected,
  }
}

/**
 * Hook for governance operations
 */
export function useGovernance() {
  const { client, publicKey, isConnected } = useGhostSpeak()

  const getActiveProposals = useCallback(async () => {
    if (!client) return []
    return client.governanceModule.getActiveProposals()
  }, [client])

  const getProposalsByProposer = useCallback(async () => {
    if (!client || !publicKey) return []
    return client.governanceModule.getProposalsByProposer(publicKey as Address)
  }, [client, publicKey])

  const getProposal = useCallback(
    async (address: string) => {
      if (!client) return null
      return client.governanceModule.getProposal(address as Address)
    },
    [client]
  )

  return {
    getActiveProposals,
    getProposalsByProposer,
    getProposal,
    isConnected,
    client: client?.governanceModule ?? null,
  }
}

/**
 * Hook for staking operations
 */
export function useStaking() {
  const { client, isConnected } = useGhostSpeak()

  return {
    client: client?.staking ?? null,
    isConnected,
  }
}
