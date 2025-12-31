'use client'

import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { useTransactionFeedback, type TransactionDetails } from '@/lib/transaction-feedback'
import { getErrorInfo } from '@/lib/errors/error-messages'

type TransactionType = TransactionDetails['type']

interface TransactionMutationOptions<TData, TVariables> {
  /** Type of transaction for feedback UI */
  transactionType: TransactionType
  /** Description generator for the transaction */
  getDescription: (variables: TVariables) => string
  /** The actual mutation function */
  mutationFn: (variables: TVariables) => Promise<{ signature: string } & TData>
  /** Called on success (after feedback is shown) */
  onSuccess?: (data: TData & { signature: string }, variables: TVariables) => void
  /** Called on error (after feedback is shown) */
  onError?: (error: Error, variables: TVariables) => void
}

/**
 * Wrapper hook that adds transaction feedback to any mutation
 *
 * Usage:
 * ```tsx
 * const createEscrow = useTransactionMutation({
 *   transactionType: 'escrow',
 *   getDescription: (data) => `Creating escrow for ${data.amount} USDC`,
 *   mutationFn: async (data) => {
 *     const signature = await client.escrows.create(...)
 *     return { signature }
 *   },
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: ['escrows'] })
 *   }
 * })
 * ```
 */
export function useTransactionMutation<TData, TVariables>({
  transactionType,
  getDescription,
  mutationFn,
  onSuccess,
  onError,
}: TransactionMutationOptions<TData, TVariables>) {
  const feedback = useTransactionFeedback()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const txId = `${transactionType}-${Date.now()}`
      const description = getDescription(variables)

      // Start showing feedback
      feedback.startTransaction(txId, {
        type: transactionType,
        description,
      })

      try {
        // Execute the mutation
        const result = await mutationFn(variables)

        // Update with signature
        feedback.updateWithSignature(txId, result.signature)

        // Mark as confirmed
        feedback.confirmTransaction(txId)

        return result
      } catch (error) {
        // Show error feedback
        const errorInfo = getErrorInfo(error)
        feedback.failTransaction(txId, errorInfo.description)
        throw error
      }
    },
    onSuccess: (data, variables) => {
      onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      onError?.(error as Error, variables)
    },
  })
}

/**
 * Helper to create transaction mutation options from standard mutation config
 */
export function withTransactionFeedback<TData extends { signature: string }, TVariables>(
  transactionType: TransactionType,
  getDescription: (variables: TVariables) => string
): Partial<UseMutationOptions<TData, Error, TVariables>> {
  return {
    meta: {
      transactionType,
      getDescription,
    },
  }
}
