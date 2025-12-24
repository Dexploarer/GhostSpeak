'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { PageHeader } from '@/components/dashboard/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Shield, CheckCircle2, Clock, AlertTriangle, ArrowRight, Plus, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useEscrows, EscrowStatus } from '@/lib/queries/escrow'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'

interface EscrowItemProps {
  id: string
  amount: string
  currency: string
  parties: [string, string]
  status: EscrowStatus
  description?: string
  progress?: number // Placeholder for now
}

function EscrowItem({
  id,
  amount,
  currency,
  parties,
  status,
  progress = 0,
  description,
}: EscrowItemProps) {
  // Determine color/icon based on status
  const isCompleted = status === EscrowStatus.Completed || status === EscrowStatus.Resolved;
  const isActionRequired = status === EscrowStatus.Disputed;
  const isActive = status === EscrowStatus.Active;

  return (
    <GlassCard className="p-4 mb-4 flex flex-col md:flex-row md:items-center gap-6">
      <div className="flex items-center gap-4 min-w-[200px]">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            isActive
              ? 'bg-blue-500/20 text-blue-500'
              : isCompleted
                ? 'bg-green-500/20 text-green-500'
                : 'bg-yellow-500/20 text-yellow-500'
          )}
        >
          {isActive ? (
            <Clock className="w-5 h-5" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>
        <div>
          <p className="font-mono text-sm text-foreground truncate max-w-[150px]" title={id}>{id}</p>
          <p className="text-xs text-muted-foreground uppercase font-semibold">{status}</p>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {description && <p className="text-sm text-muted-foreground mb-2">{description}</p>}
        
        {/* Progress Bar (Visual only for now) */}
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Status</span>
          <span>{isCompleted ? '100%' : 'Active'}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500',
              isCompleted
                ? 'bg-green-500'
                : isActionRequired
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
            )}
            style={{ width: isCompleted ? '100%' : isActionRequired ? '50%' : '25%' }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span className="font-mono">{parties[0].slice(0,6)}...</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-mono">{parties[1].slice(0,6)}...</span>
        </div>
      </div>

      <div className="text-right min-w-[120px]">
        <p className="text-lg font-bold text-foreground">
          {amount} {currency}
        </p>
        <Button variant="link" size="sm" className="h-auto p-0 text-primary">
          View Details
        </Button>
      </div>
    </GlassCard>
  )
}

export default function EscrowPage() {
  const { address, isConnected } = useWalletAddress()
  const { data: escrows = [], isLoading } = useEscrows({
    userAddress: address ?? undefined,
    role: 'all',
  })

  // Calculate stats
  const activeEscrows = escrows.filter(e => e.status === EscrowStatus.Active)
  const disputedEscrows = escrows.filter(e => e.status === EscrowStatus.Disputed)
  
  const totalSecured = activeEscrows.reduce((acc, curr) => acc + Number(curr.amount) / 1_000_000, 0) // Mock dec

  return (
    <div className="space-y-8">
      <PageHeader
        title="Escrow Management"
        description="Secure fund holding and dispute resolution for x402 transactions"
      >
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Escrow
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Active Escrows List */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-semibold text-foreground">Active Contracts</h3>
          
          {!isConnected ? (
             <GlassCard className="p-8 text-center space-y-4 border-dashed">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium">Connect Wallet</h3>
                <p className="text-muted-foreground">Connect your wallet to view your escrow contracts.</p>
             </GlassCard>
          ) : isLoading ? (
             <div className="space-y-4">
               {[1, 2, 3].map((i) => <GlassCard key={i} className="h-32 animate-pulse" />)}
             </div>
          ) : escrows.length === 0 ? (
             <GlassCard className="p-8 text-center space-y-4 border-dashed">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                   <Shield className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No Escrows Found</h3>
                <p className="text-muted-foreground">You don't have any active or past escrow contracts.</p>
                <Button variant="outline">Create New Escrow</Button>
             </GlassCard>
          ) : (
            escrows.map(escrow => (
              <EscrowItem
                key={escrow.address}
                id={escrow.taskId || escrow.address.slice(0, 8)} 
                amount={(Number(escrow.amount) / 1_000_000).toFixed(2)} // Formatting assumes USDC 6 decimals
                currency="USDC" // Placeholder - should use token metadata symbol
                parties={[escrow.client, escrow.agent]}
                status={escrow.status}
                description={escrow.taskId} 
              />
            ))
          )}
        </div>

        {/* Right: Stats & Info */}
        <div className="space-y-6">
          <GlassCard className="p-6 bg-linear-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-green-500" />
              <h3 className="font-bold text-foreground">Funds Secured</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">{isLoading? '...' : totalSecured.toFixed(2)} USDC</p>
            <p className="text-sm text-muted-foreground mt-1">Across {activeEscrows.length} active contracts</p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-yellow-500" />
              <h3 className="font-semibold text-foreground">Dispute Resolution</h3>
            </div>
            {disputedEscrows.length > 0 ? (
                <div className="space-y-4 text-sm text-muted-foreground">
                    <p>
                        You have {disputedEscrows.length} active dispute(s).
                    </p>
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                        <p className="font-medium">Action Required</p>
                        <p className="text-xs mt-1">Check governance dashboard</p>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">No active disputes requiring your attention.</p>
            )}
            
            <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard/governance">View Disputes</Link>
                </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-semibold text-foreground mb-4">How It Works</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>Create escrow when hiring an agent</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Funds held securely on-chain</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Release funds when satisfied, or dispute</span>
              </li>
            </ol>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
