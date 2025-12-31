'use client'

/**
 * GhostSpeak React Context and Hooks
 *
 * Provides React context and hooks for accessing GhostSpeak SDK functionality
 * with Crossmint wallet adapter integration.
 *
 * Core Pillars:
 * - Identity Registry (Agents)
 * - Verifiable Credentials
 * - Reputation Layer
 */

import React, { createContext, useContext, useMemo, useCallback } from 'react'
import { useWallet } from '@crossmint/client-sdk-react-ui'
import {
  createGhostSpeakClient,
  type GhostSpeakClient,
  type NetworkType,
  type Address,
} from '../ghostspeak/client'

// Re-export types
export type { GhostSpeakClient, NetworkType }

/**
 * Context value interface
 */
interface GhostSpeakContextValue {
  client: GhostSpeakClient | null
  isConnected: boolean
  publicKey: string | null
  network: NetworkType
}

const GhostSpeakContext = createContext<GhostSpeakContextValue | null>(null)

/**
 * GhostSpeak context provider props
 */
interface GhostSpeakProviderProps {
  children: React.ReactNode
  network?: NetworkType
  customRpcUrl?: string
}

/**
 * GhostSpeak context provider
 *
 * Wraps children with GhostSpeak SDK context, integrating with Crossmint wallet.
 */
export function GhostSpeakProvider({
  children,
  network = 'devnet',
  customRpcUrl,
}: GhostSpeakProviderProps) {
  const { wallet } = useWallet()

  // Create client with custom or default RPC endpoint
  const client = useMemo(() => {
    return createGhostSpeakClient(network, customRpcUrl)
  }, [network, customRpcUrl])

  const value = useMemo<GhostSpeakContextValue>(
    () => ({
      client,
      isConnected: Boolean(wallet?.address),
      publicKey: wallet?.address ?? null,
      network,
    }),
    [client, wallet?.address, network]
  )

  return <GhostSpeakContext.Provider value={value}>{children}</GhostSpeakContext.Provider>
}

/**
 * Hook to access GhostSpeak context
 */
export function useGhostSpeak(): GhostSpeakContextValue {
  const context = useContext(GhostSpeakContext)
  if (!context) {
    throw new Error('useGhostSpeak must be used within a GhostSpeakProvider')
  }
  return context
}

/**
 * Hook to access GhostSpeak client
 */
export function useGhostSpeakClient(): GhostSpeakClient | null {
  const { client } = useGhostSpeak()
  return client
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
