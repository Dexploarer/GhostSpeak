'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Settings, Users, Eye, Info, Save } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { PrivacyModeSelector } from './PrivacyModeSelector'
import { MetricVisibilityControl } from './MetricVisibilityControl'
import { AccessControlList, type AuthorizedViewer } from './AccessControlList'
import { PrivacyPreview, type ReputationData } from './PrivacyPreview'
import type { PrivacyMode } from './PrivacyIndicator'
import type { MetricSettings } from './MetricVisibilityControl'

export interface PrivacySettings {
  mode: PrivacyMode
  metricSettings: MetricSettings
  authorizedViewers: AuthorizedViewer[]
}

export interface PrivacySettingsPanelProps {
  agentAddress?: string
  initialSettings?: PrivacySettings
  reputationData?: ReputationData
  onSave?: (settings: PrivacySettings) => Promise<void>
}

const defaultMetricSettings: MetricSettings = {
  overallScore: 'public',
  reputationTier: 'public',
  totalJobsCompleted: 'public',
  totalJobsFailed: 'tier-only',
  successRate: 'public',
  avgResponseTime: 'public',
  disputesAgainst: 'authorized-only',
  disputesResolved: 'public',
  disputeRate: 'authorized-only',
  avgRating: 'public',
  totalEarnings: 'authorized-only',
  badges: 'public',
  categoryReputations: 'public',
}

const defaultReputationData: ReputationData = {
  overallScore: 7500,
  reputationTier: 'Gold',
  totalJobsCompleted: 142,
  totalJobsFailed: 3,
  successRate: 97.9,
  avgResponseTime: 450,
  disputesAgainst: 2,
  disputesResolved: 2,
  disputeRate: 1.4,
  avgRating: 4.8,
  totalEarnings: 15420,
  badges: ['Quick Responder', '100 Jobs', 'Perfect Rating'],
}

const presetConfigs: Record<
  'conservative' | 'balanced' | 'open',
  { mode: PrivacyMode; description: string }
> = {
  conservative: {
    mode: 'authorized-only',
    description: 'Only authorized viewers can see detailed metrics',
  },
  balanced: {
    mode: 'tier-only',
    description: 'Show reputation tier publicly, details to authorized viewers',
  },
  open: {
    mode: 'public',
    description: 'All reputation data is publicly visible',
  },
}

export function PrivacySettingsPanel({
  agentAddress,
  initialSettings,
  reputationData = defaultReputationData,
  onSave,
}: PrivacySettingsPanelProps): React.JSX.Element {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('mode')
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const [settings, setSettings] = useState<PrivacySettings>(
    initialSettings || {
      mode: 'public',
      metricSettings: defaultMetricSettings,
      authorizedViewers: [],
    }
  )

  const handleModeChange = (mode: PrivacyMode) => {
    setSettings((prev) => ({ ...prev, mode }))
    setHasChanges(true)
  }

  const handleMetricSettingsChange = (metricSettings: MetricSettings) => {
    setSettings((prev) => ({ ...prev, metricSettings }))
    setHasChanges(true)
  }

  const handleAddViewer = (viewer: AuthorizedViewer) => {
    setSettings((prev) => ({
      ...prev,
      authorizedViewers: [...prev.authorizedViewers, viewer],
    }))
    setHasChanges(true)
  }

  const handleRemoveViewer = (walletAddress: string) => {
    setSettings((prev) => ({
      ...prev,
      authorizedViewers: prev.authorizedViewers.filter((v) => v.walletAddress !== walletAddress),
    }))
    setHasChanges(true)
  }

  const handleBulkRemoveViewers = (addresses: string[]) => {
    setSettings((prev) => ({
      ...prev,
      authorizedViewers: prev.authorizedViewers.filter((v) => !addresses.includes(v.walletAddress)),
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!onSave) {
      // Mock save for development
      setIsSaving(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsSaving(false)
      setHasChanges(false)
      toast({
        title: 'Settings Saved',
        description: 'Your privacy settings have been updated successfully',
      })
      return
    }

    try {
      setIsSaving(true)
      await onSave(settings)
      setHasChanges(false)
      toast({
        title: 'Settings Saved',
        description: 'Your privacy settings have been updated on-chain',
      })
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(
      initialSettings || {
        mode: 'public',
        metricSettings: defaultMetricSettings,
        authorizedViewers: [],
      }
    )
    setHasChanges(false)
    toast({
      title: 'Settings Reset',
      description: 'Privacy settings restored to defaults',
    })
  }

  const applyPreset = (preset: 'conservative' | 'balanced' | 'open') => {
    const config = presetConfigs[preset]
    const newMetricSettings = { ...defaultMetricSettings }

    // Adjust metric settings based on preset
    if (preset === 'conservative') {
      Object.keys(newMetricSettings).forEach((key) => {
        newMetricSettings[key] = 'authorized-only'
      })
    } else if (preset === 'balanced') {
      Object.keys(newMetricSettings).forEach((key) => {
        if (key === 'reputationTier') {
          newMetricSettings[key] = 'public'
        } else {
          newMetricSettings[key] = 'tier-only'
        }
      })
    } else {
      // open
      Object.keys(newMetricSettings).forEach((key) => {
        newMetricSettings[key] = 'public'
      })
    }

    setSettings((prev) => ({
      ...prev,
      mode: config.mode,
      metricSettings: newMetricSettings,
    }))
    setHasChanges(true)
    toast({
      title: `${preset.charAt(0).toUpperCase() + preset.slice(1)} Preset Applied`,
      description: config.description,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Privacy Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Control who can view your agent's reputation data
          </p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Presets</CardTitle>
          <CardDescription>Apply common privacy configurations instantly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-auto flex flex-col items-start p-4"
              onClick={() => applyPreset('conservative')}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold">Conservative</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                Maximum privacy, authorized viewers only
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex flex-col items-start p-4"
              onClick={() => applyPreset('balanced')}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="font-semibold">Balanced</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                Show tier publicly, details to authorized
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex flex-col items-start p-4"
              onClick={() => applyPreset('open')}
            >
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-green-500" />
                <span className="font-semibold">Open</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                Full transparency, maximum trust
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Privacy settings are stored on-chain and apply across all platforms. Changes may take a
          few moments to propagate.
        </AlertDescription>
      </Alert>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mode" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Privacy Mode</span>
            <span className="sm:hidden">Mode</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Metrics</span>
            <span className="sm:hidden">Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Access List</span>
            <span className="sm:hidden">Access</span>
            {settings.authorizedViewers.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {settings.authorizedViewers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
            <span className="sm:hidden">Preview</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mode" className="space-y-4 mt-6">
          <PrivacyModeSelector value={settings.mode} onChange={handleModeChange} />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4 mt-6">
          <MetricVisibilityControl
            settings={settings.metricSettings}
            onChange={handleMetricSettingsChange}
            onSave={handleSave}
            onReset={handleReset}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="access" className="space-y-4 mt-6">
          <AccessControlList
            viewers={settings.authorizedViewers}
            onAddViewer={handleAddViewer}
            onRemoveViewer={handleRemoveViewer}
            onBulkRemove={handleBulkRemoveViewers}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4 mt-6">
          <PrivacyPreview
            privacyMode={settings.mode}
            metricSettings={settings.metricSettings}
            reputationData={reputationData}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
