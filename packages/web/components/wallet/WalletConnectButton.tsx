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
  const { login, logout, status: authStatus } = useAuth()
  const { wallet, status: walletStatus } = useWallet()
  const [copied, setCopied] = useState(false)

  // For non-custodial wallets, the wallet address comes from the connected wallet
  const walletAddress = wallet?.address

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[WalletConnectButton] authStatus:',
        authStatus,
        'walletStatus:',
        walletStatus,
        'walletAddress:',
        walletAddress,
        'wallet:',
        wallet
      )
    }
  }, [authStatus, walletStatus, walletAddress, wallet])

  const handleCopy = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      toast.success('Address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Loading state - auth SDK is initializing or wallet is loading
  if (authStatus === 'in-progress' || walletStatus === 'loading') {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    )
  }

  // Connected state - user is logged in and wallet is loaded with address
  if (authStatus === 'logged-in' && walletStatus === 'loaded' && walletAddress) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            {formatAddress(walletAddress)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Connected Wallet
          </DropdownMenuLabel>
          <DropdownMenuItem disabled className="text-xs text-muted-foreground font-mono">
            {walletAddress}
          </DropdownMenuItem>
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
