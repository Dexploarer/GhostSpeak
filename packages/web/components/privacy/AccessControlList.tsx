'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Calendar, User, CheckCircle2, XCircle } from 'lucide-react'
import { formatAddress } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

export interface AuthorizedViewer {
  walletAddress: string
  addedAt: number
  expiresAt?: number
  nickname?: string
}

export interface AccessControlListProps {
  viewers: AuthorizedViewer[]
  onAddViewer: (viewer: AuthorizedViewer) => void
  onRemoveViewer: (walletAddress: string) => void
  onBulkRemove: (addresses: string[]) => void
  maxViewers?: number
}

export function AccessControlList({
  viewers,
  onAddViewer,
  onRemoveViewer,
  onBulkRemove,
  maxViewers = 50,
}: AccessControlListProps): React.JSX.Element {
  const { toast } = useToast()
  const [newAddress, setNewAddress] = useState('')
  const [nickname, setNickname] = useState('')
  const [expirationDays, setExpirationDays] = useState<number | ''>('')
  const [selectedViewers, setSelectedViewers] = useState<Set<string>>(new Set())
  const [isAddingViewer, setIsAddingViewer] = useState(false)

  const validateSolanaAddress = (address: string): boolean => {
    // Basic Solana address validation
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
    return base58Regex.test(address.trim())
  }

  const handleAddViewer = () => {
    const trimmedAddress = newAddress.trim()

    if (!validateSolanaAddress(trimmedAddress)) {
      toast({
        title: 'Invalid Address',
        description: 'Please enter a valid Solana wallet address',
        variant: 'destructive',
      })
      return
    }

    if (viewers.some((v) => v.walletAddress === trimmedAddress)) {
      toast({
        title: 'Already Authorized',
        description: 'This wallet is already in your access control list',
        variant: 'destructive',
      })
      return
    }

    if (viewers.length >= maxViewers) {
      toast({
        title: 'Limit Reached',
        description: `You can only authorize up to ${maxViewers} viewers`,
        variant: 'destructive',
      })
      return
    }

    const newViewer: AuthorizedViewer = {
      walletAddress: trimmedAddress,
      addedAt: Date.now(),
      nickname: nickname.trim() || undefined,
      expiresAt:
        expirationDays && expirationDays > 0
          ? Date.now() + expirationDays * 24 * 60 * 60 * 1000
          : undefined,
    }

    onAddViewer(newViewer)
    setNewAddress('')
    setNickname('')
    setExpirationDays('')
    setIsAddingViewer(false)

    toast({
      title: 'Viewer Authorized',
      description: `${formatAddress(trimmedAddress)} can now view your reputation data`,
    })
  }

  const handleRemoveViewer = (address: string) => {
    onRemoveViewer(address)
    setSelectedViewers((prev) => {
      const next = new Set(prev)
      next.delete(address)
      return next
    })
    toast({
      title: 'Viewer Removed',
      description: 'Access has been revoked',
    })
  }

  const handleBulkRemove = () => {
    if (selectedViewers.size === 0) return
    onBulkRemove(Array.from(selectedViewers))
    setSelectedViewers(new Set())
    toast({
      title: 'Viewers Removed',
      description: `Removed ${selectedViewers.size} authorized viewer(s)`,
    })
  }

  const toggleSelectViewer = (address: string) => {
    setSelectedViewers((prev) => {
      const next = new Set(prev)
      if (next.has(address)) {
        next.delete(address)
      } else {
        next.add(address)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedViewers.size === viewers.length) {
      setSelectedViewers(new Set())
    } else {
      setSelectedViewers(new Set(viewers.map((v) => v.walletAddress)))
    }
  }

  const isExpired = (expiresAt?: number) => {
    return expiresAt ? expiresAt < Date.now() : false
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Access Control List</CardTitle>
            <CardDescription>
              Manage wallets authorized to view your reputation data
            </CardDescription>
          </div>
          <Badge variant="outline">
            {viewers.length} / {maxViewers}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Viewer Form */}
        {isAddingViewer ? (
          <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="wallet-address">Wallet Address *</Label>
              <Input
                id="wallet-address"
                placeholder="Enter Solana wallet address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname (Optional)</Label>
              <Input
                id="nickname"
                placeholder="e.g., 'Trading Partner', 'Client'"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration">Expiration (Days)</Label>
              <Input
                id="expiration"
                type="number"
                min="1"
                placeholder="Leave empty for no expiration"
                value={expirationDays}
                onChange={(e) => setExpirationDays(e.target.value ? parseInt(e.target.value) : '')}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddViewer} className="flex-1">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Add Viewer
              </Button>
              <Button variant="outline" onClick={() => setIsAddingViewer(false)}>
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsAddingViewer(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Authorized Viewer
          </Button>
        )}

        {/* Bulk Actions */}
        {viewers.length > 0 && (
          <div className="flex items-center justify-between py-2 border-t">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedViewers.size === viewers.length && viewers.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedViewers.size > 0 ? `${selectedViewers.size} selected` : 'Select all'}
              </span>
            </div>
            {selectedViewers.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkRemove}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Selected
              </Button>
            )}
          </div>
        )}

        {/* Viewers List */}
        {viewers.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No authorized viewers</p>
            <p className="text-xs text-muted-foreground">
              Add wallets to grant access to your reputation data
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {viewers.map((viewer) => {
              const expired = isExpired(viewer.expiresAt)
              return (
                <div
                  key={viewer.walletAddress}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedViewers.has(viewer.walletAddress)}
                    onCheckedChange={() => toggleSelectViewer(viewer.walletAddress)}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono">
                        {formatAddress(viewer.walletAddress, 6)}
                      </code>
                      {viewer.nickname && (
                        <Badge variant="outline" className="text-xs">
                          {viewer.nickname}
                        </Badge>
                      )}
                      {expired && (
                        <Badge variant="destructive" className="text-xs">
                          Expired
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Added {new Date(viewer.addedAt).toLocaleDateString()}</span>
                      {viewer.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expires {new Date(viewer.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveViewer(viewer.walletAddress)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
