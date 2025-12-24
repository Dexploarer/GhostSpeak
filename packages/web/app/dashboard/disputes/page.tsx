'use client'

/**
 * Disputes Dashboard Page
 *
 * View and manage disputes for escrow transactions.
 */

import { useState } from 'react'
import {
  useAllDisputes,
  useDisputeStats,
  transformDisputeForDisplay,
} from '../../../lib/queries/disputes'

// Helper to format time ago

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Truncate address
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function DisputesPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all')

  const { data: allDisputes, isLoading } = useAllDisputes()
  const stats = useDisputeStats()


  // Filter disputes
  const filteredDisputes = allDisputes?.filter((dispute) => {
    const transformed = transformDisputeForDisplay(dispute as any)
    if (!transformed) return false
    if (filter === 'pending') return !transformed.isResolved
    if (filter === 'resolved') return transformed.isResolved
    return true
  })

  // Transform for display
  const displayDisputes = filteredDisputes
    ?.map((d) => transformDisputeForDisplay(d as any))
    .filter((d) => d !== null)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Disputes</h1>
          <p className="mt-1 text-gray-400">
            View and manage escrow dispute cases
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm text-gray-400">Total Disputes</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.totalDisputes}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm text-gray-400">Pending</p>
          <p className="mt-2 text-2xl font-bold text-yellow-400">{stats.pendingDisputes}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm text-gray-400">Resolved</p>
          <p className="mt-2 text-2xl font-bold text-green-400">{stats.resolvedDisputes}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm text-gray-400">Avg AI Confidence</p>
          <p className="mt-2 text-2xl font-bold text-[#ccff00]">{stats.avgAiConfidence}%</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'resolved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-[#ccff00] text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
            <p className="text-gray-400">Loading disputes...</p>
          </div>
        ) : displayDisputes?.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
            <p className="text-gray-400">No disputes found</p>
          </div>
        ) : (
          displayDisputes?.map((dispute) => (
            <div
              key={dispute!.address}
              className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 transition-colors hover:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">
                      Dispute Case
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        dispute!.isResolved
                          ? 'bg-green-500/10 text-green-400'
                          : dispute!.requiresHumanReview
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                      }`}
                    >
                      {dispute!.isResolved
                        ? 'Resolved'
                        : dispute!.requiresHumanReview
                          ? 'Needs Review'
                          : 'Pending'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                    {dispute!.reason}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Complainant: </span>
                      <span className="font-mono text-gray-300">
                        {truncateAddress(dispute!.complainant)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Respondent: </span>
                      <span className="font-mono text-gray-300">
                        {truncateAddress(dispute!.respondent)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Evidence: </span>
                      <span className="text-gray-300">{dispute!.evidenceCount} items</span>
                    </div>
                  </div>
                </div>
                <div className="ml-6 text-right">
                  <div className="text-sm text-gray-500">
                    AI Confidence
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      dispute!.aiConfidence >= 70
                        ? 'text-green-400'
                        : dispute!.aiConfidence >= 40
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {dispute!.aiConfidence}%
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {formatTimeAgo(dispute!.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* How Disputes Work */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="text-xl font-semibold text-white">How Disputes Work</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ccff00]/10">
              <span className="text-xl font-bold text-[#ccff00]">1</span>
            </div>
            <h3 className="font-medium text-white">File Dispute</h3>
            <p className="text-sm text-gray-400">
              Either party can file a dispute if there&apos;s a disagreement about an escrow transaction.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ccff00]/10">
              <span className="text-xl font-bold text-[#ccff00]">2</span>
            </div>
            <h3 className="font-medium text-white">Submit Evidence</h3>
            <p className="text-sm text-gray-400">
              Both parties submit evidence. AI analyzes the case and provides a confidence score.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ccff00]/10">
              <span className="text-xl font-bold text-[#ccff00]">3</span>
            </div>
            <h3 className="font-medium text-white">Resolution</h3>
            <p className="text-sm text-gray-400">
              A moderator reviews the case and issues a final ruling on fund distribution.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
