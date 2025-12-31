/**
 * Upgrade Modal Component
 * Shown when user reaches their verification limit
 */

'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Star, Zap, Check, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  verificationsUsed: number
  verificationsLimit: number
}

export function UpgradeModal({
  isOpen,
  onClose,
  verificationsUsed,
  verificationsLimit,
}: UpgradeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Verification Limit Reached</DialogTitle>
              <DialogDescription>
                You've used {verificationsUsed} of {verificationsLimit} free verifications this
                month
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-muted-foreground">
            Upgrade to Pro to unlock unlimited verifications and advanced features!
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Pro Plan */}
            <Card className="p-6 border-purple-500 bg-purple-500/5">
              <Badge className="mb-4 bg-purple-600 text-white">Most Popular</Badge>
              <div className="flex items-baseline gap-2 mb-4">
                <Star className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-bold">Pro</h3>
              </div>
              <div className="mb-4">
                <span className="text-4xl font-black">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Unlimited verifications</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Full Ghost Score breakdown</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Unlimited reviews</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Performance analytics</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Email alerts</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>7-day free trial</span>
                </li>
              </ul>
              <Link href="/ghost-score/pricing" className="block">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Start Free Trial
                </Button>
              </Link>
            </Card>

            {/* Power Plan */}
            <Card className="p-6">
              <Badge className="mb-4 bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
                For Power Users
              </Badge>
              <div className="flex items-baseline gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
                <h3 className="text-2xl font-bold">Power</h3>
              </div>
              <div className="mb-4">
                <span className="text-4xl font-black">$29.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>API access (10k calls/mo)</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Webhook notifications</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>White-label profiles</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Dedicated manager</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>SLA guarantee</span>
                </li>
              </ul>
              <Link href="/ghost-score/pricing" className="block">
                <Button variant="outline" className="w-full">
                  Learn More
                </Button>
              </Link>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
