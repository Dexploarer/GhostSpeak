/**
 * Convex Payments Hook
 *
 * Manage x402 payment records in Convex
 */

'use client'

import { useQuery, useMutation } from 'convex/react'
import { useMemo, useCallback } from 'react'
import { api } from '@/convex/_generated/api'
import { useConvexUser } from './useConvexUser'
import type { Id } from '@/convex/_generated/dataModel'

export interface Payment {
  _id: Id<'payments'>
  userId: Id<'users'>
  resourceId: string
  resourceUrl: string
  resourceName: string
  amount: number
  network: string
  transactionSignature?: string
  status: string
  conversationId?: Id<'conversations'>
  messageId?: Id<'messages'>
  createdAt: number
  completedAt?: number
}

export interface PaymentStats {
  totalPayments: number
  totalSpent: number
  lastPaymentAt: number | null
}

export function useConvexPayments(limit?: number) {
  const { userId } = useConvexUser()

  // Query user's payments
  const payments = useQuery(api.payments.getByUser, userId ? { userId, limit } : 'skip') as
    | Payment[]
    | undefined

  // Query user stats
  const stats = useQuery(api.payments.getUserStats, userId ? { userId } : 'skip') as
    | PaymentStats
    | undefined

  // Mutations
  const createPayment = useMutation(api.payments.create)
  const completePayment = useMutation(api.payments.complete)
  const failPayment = useMutation(api.payments.fail)

  // Create a new payment record
  const create = useCallback(
    async (data: {
      resourceId: string
      resourceUrl: string
      resourceName: string
      amount: number
      network: string
      conversationId?: Id<'conversations'>
      messageId?: Id<'messages'>
    }) => {
      if (!userId) return null
      return createPayment({ userId, ...data })
    },
    [userId, createPayment]
  )

  // Mark payment as complete
  const complete = useCallback(
    async (paymentId: Id<'payments'>, transactionSignature: string) => {
      return completePayment({ paymentId, transactionSignature })
    },
    [completePayment]
  )

  // Mark payment as failed
  const fail = useCallback(
    async (paymentId: Id<'payments'>) => {
      return failPayment({ paymentId })
    },
    [failPayment]
  )

  return useMemo(
    () => ({
      payments: payments ?? [],
      stats: stats ?? { totalPayments: 0, totalSpent: 0, lastPaymentAt: null },
      isLoading: (payments === undefined || stats === undefined) && userId !== null,
      create,
      complete,
      fail,
    }),
    [payments, stats, userId, create, complete, fail]
  )
}

/**
 * Hook to get user's payment stats
 */
export function usePaymentStats() {
  const { stats, isLoading } = useConvexPayments(0)
  return { stats, isLoading }
}
