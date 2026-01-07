'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Plus, Key, Copy, Trash2, Check, AlertTriangle } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

export default function ApiKeysPage() {
  const { publicKey } = useWallet()
  const walletAddress = publicKey?.toString()

  const keys = useQuery(api.lib.api_keys.listApiKeys, walletAddress ? { walletAddress } : 'skip')
  const createKey = useMutation(api.lib.api_keys.createApiKey)
  const revokeKey = useMutation(api.lib.api_keys.revokeApiKey)

  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<{ key: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!walletAddress || !newKeyName.trim()) return

    setIsCreating(true)
    try {
      const result = await createKey({
        walletAddress,
        name: newKeyName,
      })
      setCreatedKey({ key: result.key, name: newKeyName })
      setNewKeyName('')
    } catch (error) {
      console.error('Failed to create key:', error)
      alert('Failed to create key. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevoke = async (keyId: Id<'apiKeys'>) => {
    if (
      !walletAddress ||
      !confirm('Are you sure you want to revoke this API key? This action cannot be undone.')
    )
      return

    try {
      await revokeKey({
        walletAddress,
        keyId,
      })
    } catch (error) {
      console.error('Failed to revoke key:', error)
      alert('Failed to revoke key.')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
        <p className="text-muted-foreground mt-2">
          Manage your API keys for accessing GhostSpeak services.
        </p>
      </header>

      {!walletAddress ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/20">
          <p className="mb-4 text-lg">Connect your wallet to manage API keys</p>
          <WalletMultiButton />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Create Key Section */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Key</CardTitle>
              <CardDescription>Generate a new API key for your applications.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 max-w-md">
                <Input
                  placeholder="Key Name (e.g. Production App)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
                <Button onClick={handleCreate} disabled={isCreating || !newKeyName.trim()}>
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create
                </Button>
              </div>

              {createdKey && (
                <Alert className="mt-6 border-green-500 bg-green-50 dark:bg-green-950/20">
                  <Key className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-600">API Key Created</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2 text-sm text-green-700 dark:text-green-400">
                      Make sure to copy your API key now. You won't be able to see it again!
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold border">
                        {createdKey.key}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(createdKey.key)}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Active Keys List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Keys</CardTitle>
              <CardDescription>Your active API keys and their status.</CardDescription>
            </CardHeader>
            <CardContent>
              {!keys ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  No active API keys found. Create one to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key) => (
                      <TableRow key={key._id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {key.keyPrefix}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {key.tier}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(key.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRevoke(key._id as Id<'apiKeys'>)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
