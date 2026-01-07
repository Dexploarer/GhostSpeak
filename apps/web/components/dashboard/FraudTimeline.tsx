'use client'

/**
 * FraudTimeline
 * Vertical timeline showing fraud signals and significant score changes
 */

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface FraudTimelineProps {
    agentAddress: string
    days?: number
}

export function FraudTimeline({ agentAddress, days = 90 }: FraudTimelineProps) {
    const timeline = useQuery(api.ghostScoreHistory.getFraudTimeline, {
        agentAddress,
        days,
    })

    if (!timeline) {
        return (
            <div className="flex items-center justify-center rounded-lg bg-zinc-900/50 py-8">
                <div className="animate-pulse text-zinc-500">Loading timeline...</div>
            </div>
        )
    }

    if (timeline.length === 0) {
        return (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="mb-2 text-sm font-medium text-zinc-300">Fraud & Risk Timeline</h3>
                <div className="flex flex-col items-center justify-center py-8">
                    <span className="text-2xl">✅</span>
                    <span className="mt-2 text-sm text-lime-400">No issues detected</span>
                    <span className="text-xs text-zinc-500">Last {days} days clean</span>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-300">Fraud & Risk Timeline</h3>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                    {timeline.length} event{timeline.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="relative ml-2 border-l-2 border-zinc-700 pl-4">
                {timeline.map((event, i) => (
                    <div key={i} className="relative mb-4 pb-4 last:mb-0 last:pb-0">
                        {/* Timeline dot */}
                        <div
                            className={`absolute -left-[21px] h-3 w-3 rounded-full border-2 ${event.severity === 'red'
                                    ? 'border-red-500 bg-red-500/30'
                                    : event.severity === 'yellow'
                                        ? 'border-amber-500 bg-amber-500/30'
                                        : 'border-zinc-500 bg-zinc-500/30'
                                }`}
                        />

                        {/* Event content */}
                        <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-lg ${event.type === 'fraud_signal'
                                                ? event.severity === 'red'
                                                    ? '🚨'
                                                    : '⚠️'
                                                : '📊'
                                            }`}
                                    >
                                        {event.type === 'fraud_signal'
                                            ? event.severity === 'red'
                                                ? '🚨'
                                                : '⚠️'
                                            : '📊'}
                                    </span>
                                    <span
                                        className={`text-xs font-medium uppercase ${event.severity === 'red'
                                                ? 'text-red-400'
                                                : event.severity === 'yellow'
                                                    ? 'text-amber-400'
                                                    : 'text-zinc-400'
                                            }`}
                                    >
                                        {event.type === 'fraud_signal' ? 'Risk Alert' : 'Score Change'}
                                    </span>
                                </div>
                                <span className="text-xs text-zinc-500">
                                    {new Date(event.timestamp).toLocaleDateString()}
                                </span>
                            </div>

                            <p className="mt-2 text-sm text-zinc-300">{event.message}</p>

                            {event.details && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {Object.entries(event.details).map(([key, value]) => (
                                        <span
                                            key={key}
                                            className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400"
                                        >
                                            {key}: {String(value)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
