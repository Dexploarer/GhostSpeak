'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

// ============================================================================
// Types
// ============================================================================

export interface PhysicalAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface OrderRecipient {
  email: string
  physicalAddress?: PhysicalAddress
}

export interface LineItem {
  productLocator: string // e.g., 'amazon:B00O79SKV6'
  quantity?: number
}

export interface PaymentMethod {
  method: 'solana' | 'base' | 'base-sepolia' | 'polygon' | string
  currency: 'usdc' | 'usdt' | 'sol' | string
  payerAddress?: string
}

export interface CreateOrderParams {
  recipient: OrderRecipient
  lineItems: LineItem[]
  payment: PaymentMethod
  locale?: string
}

export interface Order {
  orderId: string
  phase: 'pending' | 'payment' | 'delivery' | 'completed' | 'failed'
  payment?: {
    status: string
    preparation?: {
      serializedTransaction: string
    }
  }
  delivery?: {
    status: string
    trackingNumber?: string
    carrier?: string
  }
}

export interface AgentWallet {
  walletId: string
  address: string
  type: 'solana-mpc-wallet' | 'evm-smart-wallet'
  chain: string
}

// ============================================================================
// Hook
// ============================================================================

export function useCrossmintAgentCommerce() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Create a programmable wallet for an AI agent
   */
  const createAgentWallet = useCallback(async (
    linkedUser: string,
    type: 'solana-mpc-wallet' | 'evm-smart-wallet' = 'solana-mpc-wallet'
  ): Promise<AgentWallet | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/crossmint/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, linkedUser })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create wallet')
      }

      toast.success('Agent wallet created successfully')
      return data as AgentWallet
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast.error(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Create a purchase order for agentic commerce
   */
  const createOrder = useCallback(async (params: CreateOrderParams): Promise<Order | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/crossmint/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create order')
      }

      toast.success('Order created successfully')
      return data.order as Order
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast.error(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Get order status for tracking
   */
  const getOrderStatus = useCallback(async (orderId: string): Promise<Order | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crossmint/orders?orderId=${orderId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to get order status')
      }

      return data.order as Order
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Sign and submit a transaction from an agent wallet
   */
  const signTransaction = useCallback(async (
    walletId: string,
    serializedTransaction: string,
    chain: string = 'solana'
  ): Promise<{ hash: string } | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/crossmint/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, serializedTransaction, chain })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to sign transaction')
      }

      toast.success('Transaction signed and submitted')
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast.error(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Complete flow: Create order and sign payment in one call
   */
  const purchaseWithAgent = useCallback(async (
    agentWalletId: string,
    params: CreateOrderParams
  ): Promise<{ order: Order; txHash: string } | null> => {
    setLoading(true)
    setError(null)

    try {
      // 1. Create order
      const order = await createOrder(params)
      if (!order) {
        throw new Error('Failed to create order')
      }

      // 2. Check if payment requires transaction
      if (order.payment?.preparation?.serializedTransaction) {
        const chain = params.payment.method.includes('base') 
          ? params.payment.method 
          : 'solana'

        const txResult = await signTransaction(
          agentWalletId,
          order.payment.preparation.serializedTransaction,
          chain
        )

        if (!txResult) {
          throw new Error('Failed to sign payment transaction')
        }

        return { order, txHash: txResult.hash }
      }

      return { order, txHash: '' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      toast.error(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [createOrder, signTransaction])

  /**
   * Poll order status until completed or failed
   */
  const pollOrderStatus = useCallback(async (
    orderId: string,
    intervalMs: number = 30000,
    maxAttempts: number = 20
  ): Promise<Order | null> => {
    let attempts = 0

    return new Promise((resolve) => {
      const poll = setInterval(async () => {
        attempts++
        const order = await getOrderStatus(orderId)

        if (!order) {
          clearInterval(poll)
          resolve(null)
          return
        }

        if (order.phase === 'completed' || order.phase === 'failed') {
          clearInterval(poll)
          if (order.phase === 'completed') {
            toast.success('Order completed!')
          } else {
            toast.error('Order failed')
          }
          resolve(order)
          return
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll)
          toast.info('Order still processing...')
          resolve(order)
        }
      }, intervalMs)
    })
  }, [getOrderStatus])

  return {
    // State
    loading,
    error,
    
    // Wallet operations
    createAgentWallet,
    
    // Order operations
    createOrder,
    getOrderStatus,
    pollOrderStatus,
    
    // Transaction operations
    signTransaction,
    
    // Combined flows
    purchaseWithAgent
  }
}
