'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getCurrentNetwork, NETWORK_ENDPOINTS } from '@/lib/ghostspeak/client'

type SubscriptionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface SubscriptionState {
  status: SubscriptionStatus
  lastUpdate: Date | null
  error?: string
}

/**
 * WebSocket subscription for escrow account changes
 * Uses Solana's accountSubscribe RPC method
 */
export function useEscrowSubscription(escrowAddress: string | undefined) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const subscriptionIdRef = useRef<number | null>(null)
  const [state, setState] = useState<SubscriptionState>({
    status: 'disconnected',
    lastUpdate: null,
  })

  const connect = useCallback(() => {
    if (!escrowAddress) return

    const network = getCurrentNetwork()
    const httpEndpoint = NETWORK_ENDPOINTS[network]
    // Convert HTTP endpoint to WebSocket
    const wsEndpoint = httpEndpoint.replace('https://', 'wss://').replace('http://', 'ws://')

    try {
      setState((prev) => ({ ...prev, status: 'connecting' }))

      const ws = new WebSocket(wsEndpoint)
      wsRef.current = ws

      ws.onopen = () => {
        setState((prev) => ({ ...prev, status: 'connected' }))

        // Subscribe to account changes
        const subscribeMessage = {
          jsonrpc: '2.0',
          id: 1,
          method: 'accountSubscribe',
          params: [
            escrowAddress,
            {
              encoding: 'base64',
              commitment: 'confirmed',
            },
          ],
        }
        ws.send(JSON.stringify(subscribeMessage))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle subscription confirmation
          if (data.id === 1 && data.result !== undefined) {
            subscriptionIdRef.current = data.result
            return
          }

          // Handle account update notification
          if (data.method === 'accountNotification') {
            setState((prev) => ({
              ...prev,
              lastUpdate: new Date(),
            }))

            // Invalidate React Query cache for this escrow
            queryClient.invalidateQueries({
              queryKey: ['escrow', escrowAddress],
            })
            queryClient.invalidateQueries({
              queryKey: ['escrows'],
            })
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Connection error',
        }))
      }

      ws.onclose = () => {
        setState((prev) => ({ ...prev, status: 'disconnected' }))
        subscriptionIdRef.current = null
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    }
  }, [escrowAddress, queryClient])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      // Unsubscribe before closing
      if (subscriptionIdRef.current !== null) {
        const unsubscribeMessage = {
          jsonrpc: '2.0',
          id: 2,
          method: 'accountUnsubscribe',
          params: [subscriptionIdRef.current],
        }
        wsRef.current.send(JSON.stringify(unsubscribeMessage))
      }

      wsRef.current.close()
      wsRef.current = null
      subscriptionIdRef.current = null
    }
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (escrowAddress) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [escrowAddress, connect, disconnect])

  // Reconnect on error after delay
  useEffect(() => {
    if (state.status === 'error') {
      const timeout = setTimeout(() => {
        connect()
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [state.status, connect])

  return {
    ...state,
    reconnect: connect,
    disconnect,
  }
}

/**
 * Hook to manage multiple escrow subscriptions
 */
export function useEscrowSubscriptions(escrowAddresses: string[]) {
  const queryClient = useQueryClient()
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    // For multiple subscriptions, we use a single connection with multiple subscribes
    // This is more efficient than multiple WebSocket connections

    if (escrowAddresses.length === 0) {
      setActiveCount(0)
      return
    }

    const network = getCurrentNetwork()
    const httpEndpoint = NETWORK_ENDPOINTS[network]
    const wsEndpoint = httpEndpoint.replace('https://', 'wss://').replace('http://', 'ws://')

    const ws = new WebSocket(wsEndpoint)
    const subscriptionIds: Map<string, number> = new Map()

    ws.onopen = () => {
      // Subscribe to all escrow accounts
      escrowAddresses.forEach((address, index) => {
        const subscribeMessage = {
          jsonrpc: '2.0',
          id: index + 100, // Use offset to avoid conflicts
          method: 'accountSubscribe',
          params: [address, { encoding: 'base64', commitment: 'confirmed' }],
        }
        ws.send(JSON.stringify(subscribeMessage))
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Handle subscription confirmation
        if (data.id >= 100 && data.result !== undefined) {
          const index = data.id - 100
          if (escrowAddresses[index]) {
            subscriptionIds.set(escrowAddresses[index], data.result)
            setActiveCount(subscriptionIds.size)
          }
          return
        }

        // Handle account update
        if (data.method === 'accountNotification') {
          queryClient.invalidateQueries({ queryKey: ['escrows'] })
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    return () => {
      // Unsubscribe all before closing
      subscriptionIds.forEach((subId) => {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 999,
            method: 'accountUnsubscribe',
            params: [subId],
          })
        )
      })
      ws.close()
    }
  }, [escrowAddresses, queryClient])

  return { activeCount }
}
