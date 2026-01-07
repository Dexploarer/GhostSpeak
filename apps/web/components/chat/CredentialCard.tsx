'use client'

import { useState } from 'react'
import { Shield, CheckCircle2, Copy, FileJson, ExternalLink, Hash, Clock, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Credential {
    credentialId: string
    type: string
    issuedAt?: string
    isValid?: boolean
    issuer?: string
    subject?: string
}

interface CredentialCardProps {
    // Mode: 'issued' (single new cred) or 'list' (verification results)
    mode?: 'issued' | 'list'

    // For 'issued' mode
    credentialId?: string
    did?: string
    agentAddress?: string

    // For 'list' mode
    credentials?: Credential[]
    validCount?: number
    totalCount?: number

    // Shared
    onActionClick?: (prompt: string) => void
}

export function CredentialCard({
    mode = 'list',
    credentialId,
    did,
    agentAddress,
    credentials = [],
    validCount = 0,
    totalCount = 0,
    onActionClick
}: CredentialCardProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Render a Single Issued Credential (Success State)
    if (mode === 'issued') {
        return (
            <div className="w-full max-w-md my-2 overflow-hidden rounded-xl border border-lime-500/30 bg-black/40 backdrop-blur-md shadow-[0_0_15px_rgba(132,204,22,0.15)]">
                {/* Header */}
                <div className="bg-lime-500/10 px-4 py-3 border-b border-lime-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-lime-400">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm font-semibold tracking-wide uppercase">Credential Issued</span>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-lime-400" />
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-lime-500/20 flex items-center justify-center border border-lime-500/30 text-lime-400 font-bold text-xl">
                            W3C
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Verifiable Identity</h3>
                            <p className="text-xs text-white/50 mt-1 font-mono">DID:SOL:DEVNET</p>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                            <div className="text-[10px] uppercase text-white/40 font-semibold tracking-wider">Credential ID</div>
                            <div className="flex items-center justify-between gap-2">
                                <code className="text-xs text-lime-200/80 font-mono break-all line-clamp-1">
                                    {credentialId}
                                </code>
                                <button
                                    onClick={() => credentialId && copyToClipboard(credentialId)}
                                    className="p-1 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-white"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                            <div className="text-[10px] uppercase text-white/40 font-semibold tracking-wider">Subject DID</div>
                            <div className="flex items-center justify-between gap-2">
                                <code className="text-xs text-white/70 font-mono break-all line-clamp-1">
                                    {did}
                                </code>
                                <button
                                    onClick={() => did && copyToClipboard(did)}
                                    className="p-1 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-white"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 text-[10px] text-center text-white/30 font-mono">
                        Immutable • Cryptographically Signed • Permanent
                    </div>
                </div>
            </div>
        )
    }

    // Render List of Credentials (Verify State)
    return (
        <div className="w-full max-w-md my-2 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-white/70" />
                    <span className="text-sm font-medium text-white">Verification Results</span>
                </div>
                <div className={`text-xs px-2 py-0.5 rounded border ${validCount === totalCount ? 'bg-lime-500/10 border-lime-500/30 text-lime-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                    {validCount}/{totalCount} Valid
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-white/5">
                {credentials.map((cred, idx) => {
                    const isExpanded = expandedId === cred.credentialId
                    const statusColor = cred.isValid ? 'text-lime-400' : 'text-red-400'

                    return (
                        <div key={idx} className="group">
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : cred.credentialId)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center border ${cred.isValid ? 'bg-lime-500/10 border-lime-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                        {cred.isValid ? <CheckCircle2 className={`w-4 h-4 ${statusColor}`} /> : <XCircle className={`w-4 h-4 ${statusColor}`} />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white capitalize">{cred.type} Credential</div>
                                        <div className="text-[10px] text-white/50 font-mono">{cred.credentialId.slice(0, 16)}...</div>
                                    </div>
                                </div>
                                <FileJson className={`w-4 h-4 text-white/20 transition-transform ${isExpanded ? 'text-lime-400' : 'group-hover:text-white/40'}`} />
                            </button>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-black/20"
                                    >
                                        <div className="px-4 py-3 space-y-2 text-xs border-t border-white/5 shadow-inner">
                                            <div className="flex justify-between">
                                                <span className="text-white/40">Status:</span>
                                                <span className={statusColor}>{cred.isValid ? 'Active' : 'Expired / Revoked'}</span>
                                            </div>
                                            {cred.issuedAt && (
                                                <div className="flex justify-between">
                                                    <span className="text-white/40">Issued:</span>
                                                    <span className="text-white/70 font-mono">{new Date(cred.issuedAt).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            <div className="pt-2">
                                                <div className="text-white/40 mb-1">Full ID:</div>
                                                <div className="font-mono text-white/60 bg-black/40 p-2 rounded break-all select-all">
                                                    {cred.credentialId}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </div>

            {/* Footer Actions */}
            {onActionClick && (
                <div className="p-3 bg-white/5 border-t border-white/10 flex gap-2">
                    <button
                        onClick={() => onActionClick(`Issue a new credential for ${agentAddress}`)}
                        className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 transition-colors"
                    >
                        Issue New
                    </button>
                    <button
                        onClick={() => onActionClick(`Check reputation for ${agentAddress}`)}
                        className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 transition-colors"
                    >
                        Vibe Check
                    </button>
                </div>
            )}
        </div>
    )
}
