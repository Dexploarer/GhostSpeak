/**
 * API Keys Management Dashboard
 * Generate, view, and revoke B2B API keys
 */

'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Key, Copy, Trash2, Plus, AlertCircle } from 'lucide-react'
import { useConvexUser } from '@/lib/hooks/useConvexUser'
import { generateApiKey } from '@/lib/api/auth'

export default function ApiKeysPage() {
  const { user } = useConvexUser()
  const [isGenerating, setIsGenerating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyTier, setNewKeyTier] = useState<'startup' | 'growth' | 'enterprise'>('startup')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)

  // Fetch user's API keys
  const apiKeys = useQuery(api.apiKeys.getByUser, user?._id ? { userId: user._id } : 'skip')

  // Mutations
  const createKey = useMutation(api.apiKeys.create)
  const revokeKey = useMutation(api.apiKeys.revoke)

  const handleGenerateKey = async () => {
    if (!user) {
      toast.error('Please connect your wallet')
      return
    }

    if (!newKeyName.trim()) {
      toast.error('Please enter a key name')
      return
    }

    setIsGenerating(true)

    try {
      // Generate API key
      const { apiKey, hashedKey, keyPrefix } = generateApiKey()

      // Get rate limit for tier
      const rateLimits = {
        startup: 10,
        growth: 60,
        enterprise: 300,
      }

      // Save to database
      await createKey({
        userId: user._id,
        hashedKey,
        keyPrefix,
        tier: newKeyTier,
        rateLimit: rateLimits[newKeyTier],
        name: newKeyName,
      })

      setGeneratedKey(apiKey)
      setNewKeyName('')
      toast.success('API key generated successfully!')
    } catch (error) {
      console.error('Failed to generate API key:', error)
      toast.error('Failed to generate API key')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!user) return

    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      return
    }

    try {
      await revokeKey({ apiKeyId: keyId as any, userId: user._id })
      toast.success('API key revoked successfully')
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      toast.error('Failed to revoke API key')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground mt-2">
          Manage your B2B API keys for programmatic access to GhostSpeak reputation data
        </p>
      </div>

      {/* Generate New Key Card */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New API Key</CardTitle>
          <CardDescription>
            Create a new API key for your application to verify agent reputation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="Production Server"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div>
              <Label htmlFor="tier">Subscription Tier</Label>
              <Select value={newKeyTier} onValueChange={(v: any) => setNewKeyTier(v)}>
                <SelectTrigger id="tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startup">Startup (10 req/min, 1K daily)</SelectItem>
                  <SelectItem value="growth">Growth (60 req/min, 20K daily)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (300 req/min, unlimited)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerateKey} disabled={isGenerating}>
              <Plus className="w-4 h-4 mr-2" />
              Generate API Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Key Dialog */}
      {generatedKey && (
        <Dialog open={!!generatedKey} onOpenChange={() => setGeneratedKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Generated</DialogTitle>
              <DialogDescription>
                Copy this key now - you will not be able to see it again!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
                <code className="text-sm break-all">{generatedKey}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedKey)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <p>
                  Store this key securely. Anyone with this key can make API requests on your
                  behalf.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Existing Keys */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your API Keys</h2>

        {!apiKeys || apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No API keys yet. Generate your first key to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {apiKeys.map((key) => (
              <Card key={key._id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{key.name || 'Unnamed Key'}</h3>
                        <Badge variant={key.isActive ? 'default' : 'secondary'}>
                          {key.isActive ? 'Active' : 'Revoked'}
                        </Badge>
                        <Badge variant="outline">{key.tier.toUpperCase()}</Badge>
                      </div>
                      <p className="text-sm font-mono text-muted-foreground">{key.keyPrefix}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt &&
                          ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </div>

                    {key.isActive && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeKey(key._id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Documentation Link */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Learn how to use the GhostSpeak B2B API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>Example API request:</p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              {`curl -X POST https://ghostspeak.ai/api/v1/verify \\
  -H "X-API-Key: gs_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"agentAddress": "ABC123..."}'`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
