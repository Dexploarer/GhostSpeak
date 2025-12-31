'use client'

import { useAuth, useWallet } from '@crossmint/client-sdk-react-ui'
import { Button } from '@/components/ui/button'
import { Wallet, LogOut, Copy, Check, Loader2 } from 'lucide-react'
import { formatAddress } from '@/lib/utils'
import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

export function WalletConnectButton() {
  const { login, logout, status: authStatus, user } = useAuth()
  const { wallet, status: walletStatus } = useWallet()
  const [copied, setCopied] = useState(false)

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[WalletConnectButton] authStatus:',
        authStatus,
        'walletStatus:',
        walletStatus,
        'wallet:',
        wallet?.address
      )
    }
  }, [authStatus, walletStatus, wallet])

  const handleCopy = async () => {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address)
      setCopied(true)
      toast.success('Address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Loading state - auth SDK is initializing
  if (authStatus === 'initializing') {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  // User is logged in but wallet is still loading
  // This covers: in-progress, not-loaded, or any transitional state
  if (authStatus === 'logged-in' && walletStatus !== 'loaded') {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {walletStatus === 'in-progress' ? 'Creating wallet...' : 'Loading wallet...'}
      </Button>
    )
  }

  // Connected state - user is logged in AND wallet is fully loaded with address
  if (authStatus === 'logged-in' && wallet?.address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            {formatAddress(wallet.address)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Connected Wallet
          </DropdownMenuLabel>
          {user?.email && (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {user.email}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy address
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="gap-2 text-red-600">
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Not connected - show connect button
  // Using high-visibility styling with lime background and dark text
  return (
    <Button
      onClick={login}
      className="gap-2 bg-[#ccff00] text-black hover:bg-[#b8e600] border-2 border-[#ccff00] font-bold shadow-[0_0_20px_rgba(204,255,0,0.3)]"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  )
}
