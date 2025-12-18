'use client'

import { ComingSoon } from '@/components/dashboard/shared/ComingSoon'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Configure your GhostSpeak experience. Manage notifications, API keys, and account preferences."
      icon={Settings}
      features={[
        'Notification preferences',
        'API key management',
        'Webhook configuration',
        'Theme customization',
        'Security settings'
      ]}
    />
  )
}
