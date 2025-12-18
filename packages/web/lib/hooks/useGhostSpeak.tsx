'use client'

/**
 * GhostSpeak React Context and Hooks
 * 
 * Provides React context and hooks for accessing GhostSpeak SDK functionality
 * with wallet adapter integration.
 */

import React, { createContext, useContext, useMemo, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { createGhostSpeakClient, type GhostSpeakClient, type NetworkType } from '../ghostspeak/client'

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
 * Wraps children with GhostSpeak SDK context, integrating with wallet adapter.
 */
export function GhostSpeakProvider({ 
  children, 
  network = 'devnet',
  customRpcUrl 
}: GhostSpeakProviderProps) {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  
  // Create client with connection endpoint if available
  const client = useMemo(() => {
    const rpcUrl = customRpcUrl ?? connection?.rpcEndpoint
    return createGhostSpeakClient(network, rpcUrl)
  }, [network, customRpcUrl, connection?.rpcEndpoint])
  
  const value = useMemo<GhostSpeakContextValue>(() => ({
    client,
    isConnected: connected,
    publicKey: publicKey?.toBase58() ?? null,
    network,
  }), [client, connected, publicKey, network])
  
  return (
    <GhostSpeakContext.Provider value={value}>
      {children}
    </GhostSpeakContext.Provider>
  )
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
 * Hook for agent operations
 */
export function useAgents() {
  const { client, publicKey, isConnected } = useGhostSpeak()
  
  const getAllAgents = useCallback(async () => {
    if (!client) return []
    return client.agents.getAllAgents()
  }, [client])
  
  const getUserAgents = useCallback(async () => {
    if (!client || !publicKey) return []
    return client.agents.getUserAgents(publicKey as `${string}`)
  }, [client, publicKey])
  
  const getAgent = useCallback(async (address: string) => {
    if (!client) return null
    return client.agents.getAgentAccount(address as `${string}`)
  }, [client])
  
  return {
    getAllAgents,
    getUserAgents,
    getAgent,
    isConnected,
    client: client?.agents ?? null,
  }
}

/**
 * Hook for escrow operations
 */
export function useEscrows() {
  const { client, publicKey, isConnected } = useGhostSpeak()
  
  const getAllEscrows = useCallback(async () => {
    if (!client) return []
    return client.escrow.getAllEscrows()
  }, [client])
  
  const getEscrowsByBuyer = useCallback(async () => {
    if (!client || !publicKey) return []
    return client.escrow.getEscrowsByBuyer(publicKey as `${string}`)
  }, [client, publicKey])
  
  const getEscrowsBySeller = useCallback(async () => {
    if (!client || !publicKey) return []
    return client.escrow.getEscrowsBySeller(publicKey as `${string}`)
  }, [client, publicKey])
  
  return {
    getAllEscrows,
    getEscrowsByBuyer,
    getEscrowsBySeller,
    isConnected,
    client: client?.escrow ?? null,
  }
}

/**
 * Hook for marketplace operations
 */
export function useMarketplace() {
  const { client, isConnected } = useGhostSpeak()
  
  const getServiceListing = useCallback(async (address: string) => {
    if (!client) return null
    return client.marketplace.getServiceListing(address as `${string}`)
  }, [client])
  
  const getJobPosting = useCallback(async (address: string) => {
    if (!client) return null
    return client.marketplace.getJobPosting(address as `${string}`)
  }, [client])
  
  return {
    getServiceListing,
    getJobPosting,
    isConnected,
    client: client?.marketplace ?? null,
  }
}

/**
 * Hook for governance operations
 */
export function useGovernance() {
  const { client, publicKey, isConnected } = useGhostSpeak()
  
  const getActiveProposals = useCallback(async () => {
    if (!client) return []
    return client.governance.getActiveProposals()
  }, [client])
  
  const getProposalsByProposer = useCallback(async () => {
    if (!client || !publicKey) return []
    return client.governance.getProposalsByProposer(publicKey as `${string}`)
  }, [client, publicKey])
  
  const getProposal = useCallback(async (address: string) => {
    if (!client) return null
    return client.governance.getProposal(address as `${string}`)
  }, [client])
  
  return {
    getActiveProposals,
    getProposalsByProposer,
    getProposal,
    isConnected,
    client: client?.governance ?? null,
  }
}

/**
 * Hook for channel operations
 */
export function useChannels() {
  const { client, publicKey, isConnected } = useGhostSpeak()
  
  const getAllChannels = useCallback(async () => {
    if (!client) return []
    return client.channels.getAllChannels()
  }, [client])
  
  const getPublicChannels = useCallback(async () => {
    if (!client) return []
    return client.channels.getPublicChannels()
  }, [client])
  
  const getChannelsByCreator = useCallback(async () => {
    if (!client || !publicKey) return []
    return client.channels.getChannelsByCreator(publicKey as `${string}`)
  }, [client, publicKey])
  
  const getChannelMessages = useCallback(async (channelAddress: string) => {
    if (!client) return []
    return client.channels.getChannelMessages(channelAddress as `${string}`)
  }, [client])
  
  return {
    getAllChannels,
    getPublicChannels,
    getChannelsByCreator,
    getChannelMessages,
    isConnected,
    client: client?.channels ?? null,
  }
}
