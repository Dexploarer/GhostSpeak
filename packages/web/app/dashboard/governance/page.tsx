'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { PageHeader } from '@/components/dashboard/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Vote, ThumbsUp, ThumbsDown, Clock } from 'lucide-react'

function ProposalCard({ id, title, description, votesFor, votesAgainst, timeLeft, status }: any) {
   const totalVotes = votesFor + votesAgainst
   const percentageFor = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0
   
   return (
      <GlassCard variant="interactive" className="p-6 group">
         <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
               <span className="font-mono text-xs text-gray-500">#{id}</span>
               <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  {String(status)}
               </Badge>
            </div>
            <div className="flex items-center text-xs text-gray-500">
               <Clock className="w-3 h-3 mr-1" />
               {timeLeft}
            </div>
         </div>
         
         <h3 className="text-lg font-bold text-white mb-2 group-hover:text-lime-300 transition-colors">{title}</h3>
         <p className="text-sm text-gray-400 mb-6 line-clamp-2">{description}</p>
         
         {/* Voting Bar */}
         <div className="space-y-2 mb-6">
            <div className="flex justify-between text-xs text-gray-400">
               <span className="flex items-center"><ThumbsUp className="w-3 h-3 mr-1 text-green-400" /> {votesFor.toLocaleString()}</span>
               <span className="flex items-center">{votesAgainst.toLocaleString()} <ThumbsDown className="w-3 h-3 ml-1 text-red-400" /></span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
               <div className="h-full bg-green-500" style={{ width: `${percentageFor}%` }} />
               <div className="h-full bg-red-500" style={{ width: `${100 - percentageFor}%` }} />
            </div>
         </div>
         
         <div className="flex gap-3">
            <Button className="flex-1 bg-white/5 hover:bg-green-500/20 hover:text-green-400 border border-white/10">Vote For</Button>
            <Button className="flex-1 bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10">Vote Against</Button>
         </div>
      </GlassCard>
   )
}

export default function GovernancePage() {
  return (
    <div className="space-y-8">
       <PageHeader 
        title="Governance" 
        description="Participate in shaping the future of the GhostSpeak protocol"
      >
         <Button className="bg-lime-500 text-black font-bold hover:bg-lime-400">New Proposal</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <ProposalCard 
            id="GP-42"
            title="Adjust Marketplace Transaction Fees"
            description="Proposal to reduce the standard marketplace transaction fee from 2.5% to 1.5% to encourage volume growth."
            votesFor={12500}
            votesAgainst={4200}
            timeLeft="2 days left"
            status="Active"
         />
         <ProposalCard 
            id="GP-43"
            title="Add Support for SPL Token Payments"
            description="Allow agents to accept USDC and BONK directly for service payments via x402 protocol extensions."
            votesFor={8900}
            votesAgainst={1200}
            timeLeft="4 days left"
            status="Active"
         />
         <ProposalCard 
            id="GP-41"
            title="Community Treasury Allocation Q4"
            description="Allocate 50,000 GHOST tokens for developer grants and hackathon prizes."
            votesFor={15000}
            votesAgainst={500}
            timeLeft="Ended"
            status="Passed"
         />
      </div>
    </div>
  )
}