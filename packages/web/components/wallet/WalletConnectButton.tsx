'use client'

import { useAuth, useWallet } from '@crossmint/client-sdk-react-ui'
import { Button } from '@/components/ui/button'
import { Wallet, LogOut, Copy, Check, Loader2 } from 'lucide-react'
import { formatAddress } from '@/lib/utils'
import { useState } from 'react'
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
  const { login, logout, status } = useAuth()
  const { wallet } = useWallet()
  const [copied, setCopied] = useState(false)

  const isLoading = status === 'initializing'
  const isConnected = wallet?.address

  const handleCopy = async () => {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address)
      setCopied(true)
      toast.success('Address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  // Connected state
  if (isConnected && wallet?.address) {
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
  // Note: Standard shadcn outline button might be problematic on dark backgrounds if not customized
  // Forcing a solid style for high visibility
  return (
    <Button
      onClick={login}
      className="gap-2 bg-primary text-black hover:bg-lime-400 border-2 border-primary font-bold shadow-[0_0_20px_rgba(204,255,0,0.3)]"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  )
}
