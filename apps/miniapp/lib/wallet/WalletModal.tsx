'use client'

import React, { useState } from 'react'
import { useWallet } from './WalletStandardProvider'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { isDevelopment } from '@/lib/env'

interface WalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
  const { wallets, connect, connecting } = useWallet()
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)

  const handleConnect = async (walletName: string) => {
    setSelectedWallet(walletName)
    try {
      await connect(walletName)
      onOpenChange(false)
    } catch (error) {
      if (isDevelopment) {
        console.error('[Dev] Connection error:', error)
      }
      alert(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSelectedWallet(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>Choose a wallet to connect to GhostSpeak</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {wallets.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground">No Solana wallets detected</p>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Install one of these wallets:</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer">
                      Phantom
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://solflare.com/" target="_blank" rel="noopener noreferrer">
                      Solflare
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://backpack.app/" target="_blank" rel="noopener noreferrer">
                      Backpack
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet.name)}
                disabled={connecting && selectedWallet === wallet.name}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {wallet.icon && (
                  <Image
                    src={wallet.icon}
                    alt={wallet.name}
                    width={32}
                    height={32}
                    className="rounded-lg"
                    unoptimized
                  />
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium">{wallet.name}</div>
                  {connecting && selectedWallet === wallet.name && (
                    <div className="text-xs text-muted-foreground">Connecting...</div>
                  )}
                </div>
                {connecting && selectedWallet === wallet.name && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))
          )}
        </div>

        <div className="text-xs text-center text-muted-foreground">
          By connecting, you agree to our Terms of Service
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook to use wallet modal
export function useWalletModal() {
  const [visible, setVisible] = useState(false)

  return {
    visible,
    setVisible,
  }
}
