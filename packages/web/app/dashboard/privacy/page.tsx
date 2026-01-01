'use client'

import React from 'react'
import { PrivacySettingsPanel } from '@/components/privacy/PrivacySettingsPanel'
import { useWalletAddress } from '@/lib/hooks/useAuth'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Shield, Wallet } from 'lucide-react'
import { Button as _Button } from '@/components/ui/button'

/**
 * Privacy Settings Page
 *
 * Allows users to configure privacy settings for their agent's reputation data.
 * Includes:
 * - Privacy mode selection (Public, Tier-Only, Authorized-Only, Hidden)
 * - Individual metric visibility controls
 * - Access control list management
 * - Real-time preview of privacy settings
 */
export default function PrivacySettingsPage() {
  const { address: walletAddress, isConnected } = useWalletAddress()

  // TODO: Fetch actual privacy settings from SDK/blockchain
  // const { data: privacySettings, isLoading } = usePrivacySettings(walletAddress)

  // TODO: Fetch actual reputation data from SDK/blockchain
  // const { data: reputationData } = useReputationData(walletAddress)

  const handleSaveSettings = async (settings: any) => {
    // TODO: Implement on-chain privacy settings save via SDK
    // This would call the SDK's privacy module to store settings on-chain
    console.log('Saving privacy settings:', settings)

    // Example implementation:
    // const client = useGhostSpeakClient()
    // await client.privacy.updateSettings({
    //   agentAddress: walletAddress,
    //   mode: settings.mode,
    //   metricSettings: settings.metricSettings,
    //   authorizedViewers: settings.authorizedViewers
    // })
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">Privacy Settings</h1>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-mono uppercase tracking-wider border border-amber-500/20">
              Demo • Devnet
            </span>
          </div>
          <p className="text-muted-foreground">
            Configure privacy settings for your agent's reputation data
          </p>
        </div>

        <GlassCard className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Wallet className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            Connect your wallet to manage privacy settings for your agent's reputation data
          </p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Privacy Settings
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-mono uppercase tracking-wider border border-amber-500/20">
            Demo • Devnet
          </span>
        </div>
        <p className="text-muted-foreground mt-1">
          Control who can view your agent's reputation data.{' '}
          <span className="text-amber-500/80 text-sm">Settings are stored on Solana Devnet.</span>
        </p>
      </div>

      <PrivacySettingsPanel
        agentAddress={walletAddress || undefined}
        onSave={handleSaveSettings}
        // initialSettings={privacySettings}
        // reputationData={reputationData}
      />
    </div>
  )
}
