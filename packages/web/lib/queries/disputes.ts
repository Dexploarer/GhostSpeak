'use client'

/**
 * Disputes Queries
 *
 * React Query hooks for dispute operations.
 */

import { useQuery } from '@tanstack/react-query'
import { getGhostSpeakClient } from '../ghostspeak/client'
import type { Address } from '@solana/addresses'
import type { DisputeCase } from '@ghostspeak/sdk/browser'

// Query key factory
export const disputeKeys = {
  all: ['disputes'] as const,
  list: () => [...disputeKeys.all, 'list'] as const,
  detail: (address: string) => [...disputeKeys.all, 'detail', address] as const,
  byComplainant: (complainant: string) =>
    [...disputeKeys.all, 'byComplainant', complainant] as const,
  byRespondent: (respondent: string) => [...disputeKeys.all, 'byRespondent', respondent] as const,
  pending: () => [...disputeKeys.all, 'pending'] as const,
}

/**
 * Hook to get all disputes
 */
export function useAllDisputes() {
  const client = getGhostSpeakClient()

  return useQuery({
    queryKey: disputeKeys.list(),
    queryFn: async () => {
      return client.disputes.getAllDisputes()
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to get a specific dispute
 */
export function useDispute(address?: string) {
  const client = getGhostSpeakClient()

  return useQuery({
    queryKey: disputeKeys.detail(address ?? ''),
    queryFn: async () => {
      if (!address) return null
      return client.disputes.getDisputeCase(address as Address)
    },
    enabled: !!address,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to get disputes filed by a user
 */
export function useDisputesByComplainant(complainant?: string) {
  const client = getGhostSpeakClient()

  return useQuery({
    queryKey: disputeKeys.byComplainant(complainant ?? ''),
    queryFn: async () => {
      if (!complainant) return []
      return client.disputes.getDisputesByComplainant(complainant as Address)
    },
    enabled: !!complainant,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to get disputes against a user
 */
export function useDisputesByRespondent(respondent?: string) {
  const client = getGhostSpeakClient()

  return useQuery({
    queryKey: disputeKeys.byRespondent(respondent ?? ''),
    queryFn: async () => {
      if (!respondent) return []
      return client.disputes.getDisputesByRespondent(respondent as Address)
    },
    enabled: !!respondent,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to get pending disputes
 */
export function usePendingDisputes() {
  const client = getGhostSpeakClient()

  return useQuery({
    queryKey: disputeKeys.pending(),
    queryFn: async () => {
      return client.disputes.getPendingDisputes()
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to get dispute statistics
 */
export function useDisputeStats() {
  const { data: allDisputes, isLoading } = useAllDisputes()
  const { data: pendingDisputes } = usePendingDisputes()
  const client = getGhostSpeakClient()

  if (!allDisputes || isLoading) {
    return {
      totalDisputes: 0,
      pendingDisputes: 0,
      resolvedDisputes: 0,
      avgAiConfidence: 0,
      isLoading: true,
    }
  }

  const resolved = allDisputes.filter((d) => client.disputes.isResolved(d.data))
  const avgAiConfidence =
    allDisputes.length > 0
      ? allDisputes.reduce((sum, d) => sum + client.disputes.getAiConfidence(d.data), 0) /
        allDisputes.length
      : 0

  return {
    totalDisputes: allDisputes.length,
    pendingDisputes: pendingDisputes?.length ?? 0,
    resolvedDisputes: resolved.length,
    avgAiConfidence: Math.round(avgAiConfidence),
    isLoading: false,
  }
}

/**
 * Transform dispute data for UI display
 */
export function transformDisputeForDisplay(dispute: { address: Address; data: DisputeCase }) {
  if (!dispute.data) return null
  const client = getGhostSpeakClient()

  return {
    address: dispute.address.toString(),
    transaction: dispute.data.transaction.toString(),
    complainant: dispute.data.complainant.toString(),
    respondent: dispute.data.respondent.toString(),
    reason: dispute.data.reason,
    isResolved: client.disputes.isResolved(dispute.data),
    evidenceCount: client.disputes.getEvidenceCount(dispute.data),
    aiConfidence: client.disputes.getAiConfidence(dispute.data),
    requiresHumanReview: client.disputes.requiresHumanReview(dispute.data),
    createdAt: new Date(Number(dispute.data.createdAt) * 1000),
  }
}
