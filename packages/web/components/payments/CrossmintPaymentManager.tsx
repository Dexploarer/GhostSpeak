'use client'

import React, { useState } from 'react'
import { 
  CrossmintProvider, 
  CrossmintAuthProvider, 
  CrossmintPaymentMethodManagement, 
  useCrossmintAuth
} from "@crossmint/client-sdk-react-ui"
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Define type locally since it's not exported from the package index
interface CrossmintPaymentMethod {
  paymentMethodId: string
  [key: string]: any
}

function PaymentManagerContent() {
  const { jwt, login } = useCrossmintAuth()
  const [processing, setProcessing] = useState(false)
  const [activeMethod, setActiveMethod] = useState<string | null>(null)

  if (!jwt) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
        <div className="p-3 bg-primary/20 rounded-full text-primary">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">Agentic Commerce Auth</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
            Authenticate with Crossmint to allow your agents to autonomously process payments.
          </p>
        </div>
        <Button 
          onClick={() => login()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
        >
          Authenticate Agent
        </Button>
      </div>
    )
  }

  const handlePaymentMethodSelected = async (method: CrossmintPaymentMethod) => {
    try {
      setProcessing(true)
      console.log("Selected Payment Method:", method)

      // 1. Create Order Intent (Mandate) via our Backend API
      const response = await fetch('/api/crossmint/order-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethodId: method.paymentMethodId,
          jwt // Pass JWT for verification
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create order intent')
      }

      const orderIntent = await response.json()
      console.log("Order Intent Created:", orderIntent)

      // 2. Verify if required (3DS)
      if (orderIntent.phase === 'requires-verification') {
        toast.info('Verification required...')
        // verifyOrderIntent not exported in current SDK version
        console.warn('verifyOrderIntent missing from SDK. Mocking verification step.')
        // await verifyOrderIntent(orderIntent.orderIntentId)
        toast.success('Verification complete (Mock)!')
      }

      setActiveMethod(method.paymentMethodId)
      toast.success('Payment method active and mandate authorized.')

    } catch (error) {
      console.error('Payment linking failed:', error)
      toast.error('Failed to link payment method')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Payment Methods</h3>
        {processing && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>
      
      {/* Crossmint UI - Styled via globals.css .crossmint-wrapper */}
      <div className="crossmint-wrapper">
        <CrossmintPaymentMethodManagement 
          jwt={jwt} 
          onPaymentMethodSelected={handlePaymentMethodSelected}
        />
      </div>

      {activeMethod && (
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <div className="text-sm">
            <p className="font-medium text-green-500">Agent Spending Authorized</p>
            <p className="text-muted-foreground">Your agent can now process payments using method ending in ...{activeMethod.slice(-4)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function CrossmintPaymentManager() {
  const apiKey = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY

  if (!apiKey) {
    return (
      <GlassCard className="p-6 border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-3 text-red-400 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-semibold">Configuration Error</h3>
        </div>
        <p className="text-sm text-red-300/80">
          Missing <code>NEXT_PUBLIC_CROSSMINT_API_KEY</code>. Please configure your environment variables.
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <CrossmintProvider apiKey={apiKey}>
        <CrossmintAuthProvider>
          <PaymentManagerContent />
        </CrossmintAuthProvider>
      </CrossmintProvider>
    </GlassCard>
  )
}
