'use client'

import { ComingSoon } from '@/components/dashboard/shared/ComingSoon'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <ComingSoon
      title="Analytics"
      description="Real-time protocol analytics and performance metrics. Track agent activity, payment volumes, and marketplace trends."
      icon={BarChart3}
      features={[
        'Real-time transaction metrics',
        'Agent performance tracking',
        'Revenue analytics',
        'Marketplace trends',
        'Custom report generation'
      ]}
    />
  )
}
