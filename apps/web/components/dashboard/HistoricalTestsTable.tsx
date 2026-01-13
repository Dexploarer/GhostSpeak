'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Doc } from '@/convex/_generated/dataModel'
import { CheckCircle2, XCircle, Clock, Zap, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function HistoricalTestsTable() {
  const logs = useQuery(api.observation.getRecentObservations, { limit: 50 })

  if (logs === undefined) return <div className="p-4 text-white/40 text-sm">Loading logs...</div>
  if (logs.length === 0)
    return <div className="p-4 text-white/40 text-sm">No historical tests found.</div>

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden mt-8">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Historical Tests
        </h3>
        <span className="text-xs text-white/40">Last 50 observations</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-white/40 uppercase bg-white/5">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.map((log: any) => (
              <tr key={log._id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  {log.status === 'success' ? (
                    <div className="flex items-center gap-1.5 text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">PASS</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-400">
                      <XCircle className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">FAIL</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-white/80">
                  {log.agentAddress.slice(0, 8)}...
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-white/5 text-xs text-white/60 capitalize border border-white/5">
                    {log.testType}
                  </span>
                </td>
                <td
                  className="px-4 py-3 max-w-xs truncate text-white/60"
                  title={JSON.stringify(log.details)}
                >
                  {JSON.stringify(log.details)}
                </td>
                <td className="px-4 py-3 text-right text-white/40 whitespace-nowrap">
                  {formatTime(log.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
