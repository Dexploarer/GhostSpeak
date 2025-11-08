/**
 * x402 Payment History Component
 *
 * Displays user's x402 payment transactions
 */

'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { History, ExternalLink, CheckCircle2, Clock, XCircle, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useX402PaymentHistory } from '@/lib/hooks/useX402'
import { formatDistance } from 'date-fns'

export function PaymentHistory(): React.JSX.Element {
  const { publicKey } = useWallet()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: payments = [], isLoading, isError } = useX402PaymentHistory()

  const filteredPayments = payments.filter((payment) =>
    payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.recipient.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!publicKey) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to view payment history
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Payment History
        </CardTitle>
        <CardDescription>
          Your x402 micropayment transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading payments...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-2" />
            <p className="text-red-500">Failed to load payment history</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredPayments.length === 0 && (
          <div className="text-center py-8">
            <History className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'No matching payments' : 'No payment history yet'}
            </p>
          </div>
        )}

        {/* Payment List */}
        {!isLoading && !isError && filteredPayments.length > 0 && (
          <div className="space-y-3">
            {filteredPayments.map((payment) => (
              <PaymentItem key={payment.signature} payment={payment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface PaymentItemProps {
  payment: {
    signature: string
    recipient: string
    amount: bigint
    token: string
    timestamp: number
    status?: 'pending' | 'confirmed' | 'failed'
    description?: string
    metadata?: Record<string, string>
  }
}

function PaymentItem({ payment }: PaymentItemProps): React.JSX.Element {
  const amount = Number(payment.amount) / 1e9 // Convert lamports to SOL
  const status = payment.status ?? 'confirmed'

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      label: 'Pending'
    },
    confirmed: {
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/20',
      label: 'Confirmed'
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/20',
      label: 'Failed'
    }
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div className="glass rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Description */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded ${config.bg}`}>
              <StatusIcon className={`w-4 h-4 ${config.color}`} />
            </div>
            <h4 className="font-medium truncate">
              {payment.description ?? 'x402 Payment'}
            </h4>
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
          </div>

          {/* Details */}
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>To:</span>
              <span className="font-mono text-xs truncate">
                {payment.recipient.slice(0, 8)}...{payment.recipient.slice(-8)}
              </span>
            </div>
            <div>
              {formatDistance(new Date(payment.timestamp), new Date(), {
                addSuffix: true
              })}
            </div>
          </div>
        </div>

        {/* Amount & Link */}
        <div className="text-right shrink-0">
          <div className="text-lg font-bold mb-2">
            {amount.toFixed(6)} SOL
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.open(
                `https://explorer.solana.com/tx/${payment.signature}?cluster=devnet`,
                '_blank'
              )
            }}
            className="gap-1"
          >
            <span className="text-xs">View</span>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Metadata */}
      {payment.metadata && Object.keys(payment.metadata).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Metadata
            </summary>
            <pre className="mt-2 p-2 rounded bg-gray-100 dark:bg-gray-800 overflow-x-auto">
              {JSON.stringify(payment.metadata, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
