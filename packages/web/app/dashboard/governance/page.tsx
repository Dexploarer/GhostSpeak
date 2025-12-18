'use client'

import { ComingSoon } from '@/components/dashboard/shared/ComingSoon'
import { Vote } from 'lucide-react'

export default function GovernancePage() {
  return (
    <ComingSoon
      title="Governance"
      description="Participate in decentralized protocol governance. Vote on proposals, delegate voting power, and shape the future of GhostSpeak."
      icon={Vote}
      features={[
        'On-chain proposal creation',
        'Token-weighted voting',
        'Vote delegation',
        'Quorum enforcement',
        'Timelock execution'
      ]}
    />
  )
}
