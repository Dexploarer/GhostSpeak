'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Zap, Shield, Sparkles } from 'lucide-react'
import { MeshGradientGhost } from '@/components/shared/MeshGradientGhost'
import { cn } from '@/lib/utils'

interface ChatSidebarLeftProps {
    publicKey: string | null
    userScore: any // Typed as any to match current usage, refine later
    localMessagesCount: number
    isLoading: boolean
    onNewChat: () => void
    onAction: (prompt: string) => void
}

export const ChatSidebarLeft: React.FC<ChatSidebarLeftProps> = ({
    publicKey,
    userScore,
    localMessagesCount,
    isLoading,
    onNewChat,
    onAction,
}) => {
    return (
        <div className="w-64 border-r border-white/5 flex flex-col bg-[#0a0a0a]/50 backdrop-blur-xl h-full">
            {/* Header */}
            <div className="p-4 shrink-0">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white transition-colors mb-6 group"
                >
                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back to Dashboard</span>
                </Link>
                <button
                    onClick={onNewChat}
                    className="w-full group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl hover:bg-white/90 transition-all text-sm font-medium shadow-lg shadow-white/5 hover:shadow-white/10"
                >
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    <span>New Session</span>

                    {/* Shine effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0" data-lenis-prevent>
                {/* User's Ghost Score Card */}
                {publicKey && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                            <Shield className="w-3 h-3 text-white/40" />
                            <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest">
                                Your Reputation
                            </h3>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group relative overflow-hidden">
                            {/* Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            {userScore ? (
                                <>
                                    <div className="relative">
                                        <div className="flex items-baseline gap-1.5 mb-1">
                                            <span className="text-3xl font-bold text-white tracking-tight">
                                                {userScore.score.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-white/40 font-medium">/ 10k</span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full"
                                                    style={{ width: `${(userScore.score / 10000) * 100}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-lime-400 font-medium">{userScore.tier}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => onAction(`What's my ghost score?`)}
                                                className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all hover:border-white/10"
                                            >
                                                Analyze
                                            </button>
                                            <button
                                                onClick={() => onAction(`What credentials do I have?`)}
                                                className="px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all hover:border-white/10"
                                            >
                                                My VCs
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-white/40 py-2">
                                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                                    Calculating...
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Session Info */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <Sparkles className="w-3 h-3 text-white/40" />
                        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest">
                            Session
                        </h3>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-white/60">Messages</span>
                            <span className="text-white font-medium">{localMessagesCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-white/60">Status</span>
                            <span className="flex items-center gap-2 text-white font-medium">
                                <span className={cn("w-1.5 h-1.5 rounded-full", isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
                                {isLoading ? 'Processing' : 'Active'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / User */}
            <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">{publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}</div>
                        <div className="text-[10px] text-white/40">Connected</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
