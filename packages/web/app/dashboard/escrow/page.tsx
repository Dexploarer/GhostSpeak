'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { PageHeader } from '@/components/dashboard/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Shield, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock Component for Escrow Item
function EscrowItem({ id, amount, parties, status, progress }: any) {
   return (
      <GlassCard className="p-4 mb-4 flex flex-col md:flex-row md:items-center gap-6">
         <div className="flex items-center gap-4 min-w-[200px]">
            <div className={cn(
               "w-10 h-10 rounded-full flex items-center justify-center",
               status === 'active' ? "bg-blue-500/20 text-blue-400" :
               status === 'completed' ? "bg-green-500/20 text-green-400" :
               "bg-yellow-500/20 text-yellow-400"
            )}>
               {status === 'active' ? <Clock className="w-5 h-5" /> :
                status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
               <p className="font-mono text-sm text-gray-300">{String(id)}</p>
               <p className="text-xs text-gray-500 uppercase font-semibold">{String(status)}</p>
            </div>
         </div>
         
         <div className="flex-1 space-y-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
               <span>Progress</span>
               <span>{String(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
               <div className={cn("h-full transition-all duration-500", status === 'completed' ? "bg-green-500" : "bg-blue-500")} style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
               <span>{String(parties[0])}</span>
               <ArrowRight className="w-3 h-3" />
               <span>{String(parties[1])}</span>
            </div>
         </div>
         
         <div className="text-right min-w-[100px]">
            <p className="text-lg font-bold text-white">{amount} SOL</p>
            <Button variant="link" size="sm" className="h-auto p-0 text-lime-400">View Details</Button>
         </div>
      </GlassCard>
   )
}

export default function EscrowPage() {
  return (
    <div className="space-y-8">
       <PageHeader 
        title="Escrow Management" 
        description="Secure fund holding and dispute resolution for agent transactions"
      >
         <Button className="bg-lime-500 hover:bg-lime-400 text-black font-bold">Create Escrow</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Left: Active Escrows List */}
         <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-semibold text-white">Active Contracts</h3>
            <EscrowItem 
               id="ESC-9281-A" 
               amount="125.00" 
               parties={['Wallet...8x92', 'Agent...3k29']} 
               status="active" 
               progress={65} 
            />
            <EscrowItem 
               id="ESC-1122-B" 
               amount="42.50" 
               parties={['Wallet...7a11', 'Agent...9p44']} 
               status="dispute" 
               progress={40} 
            />
            
            <h3 className="text-lg font-semibold text-white pt-4">Recent History</h3>
            <EscrowItem 
               id="ESC-0032-C" 
               amount="10.00" 
               parties={['Wallet...8x92', 'Agent...1m22']} 
               status="completed" 
               progress={100} 
            />
         </div>
         
         {/* Right: Stats & Info */}
         <div className="space-y-6">
            <GlassCard className="p-6 bg-linear-to-br from-green-900/20 to-emerald-900/20 border-green-500/20">
               <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-green-400" />
                  <h3 className="font-bold text-white">Funds Secured</h3>
               </div>
               <p className="text-3xl font-bold text-white">167.50 SOL</p>
               <p className="text-sm text-gray-400 mt-1">Across 2 active contracts</p>
            </GlassCard>
            
            <GlassCard className="p-6">
               <h3 className="font-semibold text-white mb-4">Dispute Resolution</h3>
               <div className="space-y-4 text-sm text-gray-400">
                  <p>
                     Open disputes require arbitrator intervention. Check the governance portal for active cases assigned to you.
                  </p>
                  <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                     Go to Governance
                  </Button>
               </div>
            </GlassCard>
         </div>
      </div>
    </div>
  )
}