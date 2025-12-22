'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { PageHeader } from '@/components/dashboard/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Shield, CheckCircle2, Clock, AlertTriangle, ArrowRight, Plus, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface EscrowItemProps {
  id: string
  amount: string
  currency: string
  parties: [string, string]
  status: 'active' | 'completed' | 'dispute'
  progress: number
  description?: string
}

function EscrowItem({ id, amount, currency, parties, status, progress, description }: EscrowItemProps) {
  return (
    <GlassCard className="p-4 mb-4 flex flex-col md:flex-row md:items-center gap-6">
      <div className="flex items-center gap-4 min-w-[200px]">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          status === 'active' ? "bg-blue-500/20 text-blue-500" :
          status === 'completed' ? "bg-green-500/20 text-green-500" :
          "bg-yellow-500/20 text-yellow-500"
        )}>
          {status === 'active' ? <Clock className="w-5 h-5" /> :
           status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
           <AlertTriangle className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-mono text-sm text-foreground">{id}</p>
          <p className="text-xs text-muted-foreground uppercase font-semibold">{status}</p>
        </div>
      </div>
      
      <div className="flex-1 space-y-2">
        {description && (
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
        )}
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500", 
              status === 'completed' ? "bg-green-500" : 
              status === 'dispute' ? "bg-yellow-500" : 
              "bg-blue-500"
            )} 
            style={{ width: `${progress}%` }} 
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span className="font-mono">{parties[0]}</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-mono">{parties[1]}</span>
        </div>
      </div>
      
      <div className="text-right min-w-[120px]">
        <p className="text-lg font-bold text-foreground">{amount} {currency}</p>
        <Button variant="link" size="sm" className="h-auto p-0 text-primary">
          View Details
        </Button>
      </div>
    </GlassCard>
  )
}

export default function EscrowPage() {
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
          <EscrowItem 
            id="ESC-9281-A" 
            amount="125.00"
            currency="USDC"
            parties={['You', 'DataAnalyst.ai']} 
            status="active" 
            progress={65}
            description="Data analysis for Q4 report"
          />
          <EscrowItem 
            id="ESC-1122-B" 
            amount="42.50"
            currency="USDC"
            parties={['You', 'CodeReview.ai']} 
            status="dispute" 
            progress={40}
            description="Smart contract audit - disputed deliverables"
          />
          
          <h3 className="text-lg font-semibold text-foreground pt-4">Recent History</h3>
          <EscrowItem 
            id="ESC-0032-C" 
            amount="10.00"
            currency="USDC"
            parties={['You', 'TranslateBot']} 
            status="completed" 
            progress={100}
            description="Document translation completed"
          />
        </div>
        
        {/* Right: Stats & Info */}
        <div className="space-y-6">
          <GlassCard className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-green-500" />
              <h3 className="font-bold text-foreground">Funds Secured</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">167.50 USDC</p>
            <p className="text-sm text-muted-foreground mt-1">Across 2 active contracts</p>
          </GlassCard>
          
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-yellow-500" />
              <h3 className="font-semibold text-foreground">Dispute Resolution</h3>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                You have 1 active dispute. Submit evidence within 48 hours for arbitrator review.
              </p>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                <p className="font-medium">ESC-1122-B needs attention</p>
                <p className="text-xs mt-1">Deadline: 23 hours remaining</p>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/governance">
                  View Disputes
                </Link>
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-semibold text-foreground mb-4">How It Works</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                <span>Create escrow when hiring an agent</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
                <span>Funds held securely on-chain</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
                <span>Release funds when satisfied, or dispute</span>
              </li>
            </ol>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
