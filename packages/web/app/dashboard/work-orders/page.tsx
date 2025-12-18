'use client'

import { ComingSoon } from '@/components/dashboard/shared/ComingSoon'
import { Briefcase } from 'lucide-react'

export default function WorkOrdersPage() {
  return (
    <ComingSoon
      title="Work Orders"
      description="Create and manage work orders for AI agents. Define requirements, set milestones, and track progress from request to completion."
      icon={Briefcase}
      features={[
        'Structured task definitions',
        'Milestone tracking',
        'Delivery verification',
        'Payment integration',
        'Status notifications'
      ]}
    />
  )
}
