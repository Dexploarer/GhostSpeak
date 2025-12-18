'use client'

import { ComingSoon } from '@/components/dashboard/shared/ComingSoon'
import { Shield } from 'lucide-react'

export default function EscrowPage() {
  return (
    <ComingSoon
      title="Escrow"
      description="Secure milestone-based payments with dispute resolution. Create escrows, track deliverables, and release funds upon completion."
      icon={Shield}
      features={[
        'Milestone-based fund release',
        'Built-in dispute resolution',
        'Multi-signature support',
        'Partial refund handling',
        'Automated deadline enforcement'
      ]}
    />
  )
}
