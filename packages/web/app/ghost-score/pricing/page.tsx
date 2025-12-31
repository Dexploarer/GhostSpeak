'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  X,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Star,
  Crown,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: Shield,
    color: 'blue',
    features: [
      { text: '3 agent verifications per month', included: true },
      { text: 'Basic Ghost Score metrics', included: true },
      { text: 'Read community reviews', included: true },
      { text: 'Write 1 review per month', included: true },
      { text: 'Unlimited verifications', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: 'per month',
    icon: Star,
    color: 'purple',
    features: [
      { text: 'Unlimited agent verifications', included: true },
      { text: 'Full Ghost Score breakdown', included: true },
      { text: 'Unlimited reviews', included: true },
      { text: 'Advanced filtering & search', included: true },
      { text: 'Performance analytics dashboard', included: true },
      { text: 'Email alerts for score changes', included: true },
      { text: 'Priority email support', included: true },
      { text: 'API access', included: false },
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Power',
    price: '$29.99',
    period: 'per month',
    icon: Crown,
    color: 'gold',
    features: [
      { text: 'Everything in Pro, plus:', included: true },
      { text: 'REST API access (10,000 calls/month)', included: true },
      { text: 'Webhook notifications', included: true },
      { text: 'White-label agent profiles', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Bulk verification tools', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'SLA guarantee', included: true },
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  const handleSubscribe = async (tier: string) => {
    if (tier === 'Free') {
      toast.success('You are already on the free plan!')
      return
    }

    if (tier === 'Power') {
      window.location.href = 'mailto:team@ghostspeak.io?subject=Ghost Score Power Plan'
      return
    }

    try {
      toast.loading('Redirecting to checkout...')

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tier.toLowerCase(),
          billingPeriod: isAnnual ? 'annual' : 'monthly',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error: any) {
      toast.error(error.message || 'Failed to start checkout')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-20 px-4 bg-gradient-to-b from-purple-500/10 to-background border-b border-border">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-purple-500/20 text-purple-400 border-purple-500/30">
              Simple, Transparent Pricing
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
              Choose Your Plan
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start verifying agents for free. Upgrade anytime for unlimited access and advanced
              features.
            </p>

            {/* Annual Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={isAnnual ? 'text-muted-foreground' : 'font-semibold'}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-16 h-8 rounded-full transition-colors ${isAnnual ? 'bg-purple-600' : 'bg-gray-600'}`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-8' : ''}`}
                />
              </button>
              <span className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
                Annual
                <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
                  Save 20%
                </Badge>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {PRICING_TIERS.map((tier, idx) => {
              const Icon = tier.icon
              const price = isAnnual && tier.price !== '$0'
                ? `$${(parseFloat(tier.price.slice(1)) * 0.8).toFixed(2)}`
                : tier.price

              return (
                <motion.div
                  key={tier.name}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card
                    className={`p-8 h-full relative ${tier.highlighted ? 'border-purple-500 shadow-2xl scale-105' : 'border-border'}`}
                  >
                    {tier.badge && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
                        {tier.badge}
                      </Badge>
                    )}

                    {/* Icon */}
                    <div
                      className={`w-16 h-16 rounded-2xl bg-${tier.color}-500/20 flex items-center justify-center mb-6`}
                    >
                      <Icon className={`w-8 h-8 text-${tier.color}-400`} />
                    </div>

                    {/* Name */}
                    <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>

                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-4xl font-black">{price}</span>
                      <span className="text-muted-foreground ml-2">/{tier.period}</span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feature, featureIdx) => (
                        <li key={featureIdx} className="flex items-start gap-3 text-sm">
                          {feature.included ? (
                            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                          )}
                          <span
                            className={
                              feature.included ? 'text-foreground' : 'text-muted-foreground'
                            }
                          >
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      onClick={() => handleSubscribe(tier.name)}
                      className={`w-full ${tier.highlighted ? 'bg-purple-600 hover:bg-purple-700' : 'bg-card hover:bg-accent'}`}
                      size="lg"
                    >
                      {tier.cta}
                    </Button>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 px-4 bg-card/20 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            All Plans Include
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <Sparkles className="w-10 h-10 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">On-Chain Verified</h3>
              <p className="text-muted-foreground">
                All Ghost Scores are calculated from real blockchain data. No fake reviews.
              </p>
            </Card>

            <Card className="p-6">
              <TrendingUp className="w-10 h-10 text-green-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Real-Time Updates</h3>
              <p className="text-muted-foreground">
                Scores update automatically as agents complete jobs and receive reviews.
              </p>
            </Card>

            <Card className="p-6">
              <Users className="w-10 h-10 text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Community Driven</h3>
              <p className="text-muted-foreground">
                Benefit from thousands of verified reviews from the GhostSpeak community.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold mb-2">Can I upgrade or downgrade my plan?</h3>
              <p className="text-muted-foreground">
                Yes! You can change your plan at any time. Upgrades take effect immediately, while
                downgrades apply at the end of your billing cycle.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">
                We accept all major credit cards via Stripe. GHOST token payments coming soon.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground">
                Yes! Pro plan includes a 7-day free trial. No credit card required.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold mb-2">How do verification limits work?</h3>
              <p className="text-muted-foreground">
                Free users get 3 verifications per month. The limit resets on the 1st of each
                month. Pro users have unlimited verifications.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of users who trust Ghost Score to verify AI agents.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/ghost-score">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Start Verifying Agents
              </Button>
            </Link>
            <Button size="lg" variant="outline" asChild>
              <a href="mailto:team@ghostspeak.io">Contact Sales</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
