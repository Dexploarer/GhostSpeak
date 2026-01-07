'use client'

import { useState } from 'react'
import { Terminal, Activity, DollarSign, Clock, Check, AlertTriangle, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface X402ResultCardProps {
    endpoint: string
    method: string
    status: number
    responseTime: number
    data: any
    isStructured: boolean
    agent?: {
        address: string
        name?: string
    } | null
}

export function X402ResultCard({
    endpoint,
    method,
    status,
    responseTime,
    data,
    isStructured,
    agent
}: X402ResultCardProps) {
    const [showRaw, setShowRaw] = useState(false)

    const isPaymentRequired = status === 402
    const isSuccess = status >= 200 && status < 300
    const isError = status >= 400 && status !== 402

    const statusColor = isPaymentRequired
        ? 'text-amber-400'
        : isSuccess
            ? 'text-lime-400'
            : 'text-red-400'

    return (
        <div className="w-full max-w-lg my-2 rounded-lg border border-white/10 bg-[#0c0c0c] font-mono text-sm overflow-hidden shadow-xl">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-white/50" />
                    <span className="text-xs text-white/70">X402 Request</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-lime-500/20 border border-lime-500/50" />
                </div>
            </div>

            {/* Request Info */}
            <div className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/80">{method}</span>
                            <span className={`text-sm font-bold ${statusColor}`}>{status} {isPaymentRequired ? 'Payment Required' : isSuccess ? 'OK' : 'Error'}</span>
                        </div>
                        <div className="text-xs text-white/40 break-all">{endpoint}</div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/30 bg-white/5 px-2 py-1 rounded">
                        <Clock className="w-3 h-3" />
                        {responseTime}ms
                    </div>
                </div>

                {/* Payment Required Visual */}
                {isPaymentRequired && (
                    <div className="p-3 rounded border border-amber-500/30 bg-amber-500/10 space-y-2">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                            <DollarSign className="w-4 h-4" />
                            Payment Gate Active
                        </div>
                        <div className="text-white/80 text-xs">
                            This endpoint is protected by an x402 paywall.
                        </div>
                        {data?.payment && (
                            <div className="mt-2 text-xs space-y-1 bg-black/20 p-2 rounded">
                                {data.payment.amount && <div className="flex justify-between"><span className="text-white/40">Amount:</span> <span className="text-amber-200">{data.payment.amount}</span></div>}
                                {data.payment.token && <div className="flex justify-between"><span className="text-white/40">Token:</span> <span className="text-white/60">{data.payment.token}</span></div>}
                                {data.payment.address && <div className="flex justify-between"><span className="text-white/40">Destination:</span> <span className="text-white/60 font-mono">{data.payment.address.slice(0, 6)}...{data.payment.address.slice(-4)}</span></div>}
                            </div>
                        )}
                    </div>
                )}

                {/* Payload / Response */}
                <div className="space-y-2">
                    <button
                        onClick={() => setShowRaw(!showRaw)}
                        className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
                    >
                        {showRaw ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Response Payload
                    </button>

                    <AnimatePresence>
                        {(showRaw || !isPaymentRequired) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="relative group block"
                            >
                                <pre className="text-[10px] leading-relaxed p-3 rounded bg-black/50 border border-white/5 text-white/70 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-white/10">
                                    {JSON.stringify(data, null, 2)}
                                </pre>
                                <button
                                    onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
                                    className="absolute top-2 right-2 p-1.5 bg-white/10 rounded opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all text-white/60"
                                    title="Copy JSON"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer / Agent */}
            {agent?.address && (
                <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex items-center gap-2 truncate">
                    <div className="w-2 h-2 rounded-full bg-blue-400/50" />
                    <span className="text-xs text-white/40">Provider:</span>
                    <span className="text-xs text-white/60 font-mono truncate">{agent.name || agent.address}</span>
                </div>
            )}
        </div>
    )
}
