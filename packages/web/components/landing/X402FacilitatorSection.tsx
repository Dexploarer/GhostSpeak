'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Server, CheckCircle2, Shield, Globe, Zap, ExternalLink } from 'lucide-react'
import { GhostIcon } from '../shared/GhostIcon'

/**
 * X402FacilitatorSection - Landing page component explaining GhostSpeak's x402 facilitator
 */
export function X402FacilitatorSection() {
  const features = [
    {
      icon: CheckCircle2,
      title: 'Payment Verification',
      description: 'Verify x402 payments on Solana mainnet and devnet',
    },
    {
      icon: Shield,
      title: 'Escrow Protection',
      description: 'Funds held on-chain until work is verified',
    },
    {
      icon: Globe,
      title: 'Multi-Network',
      description: 'Supports Solana mainnet and devnet simultaneously',
    },
    {
      icon: Zap,
      title: 'Zero API Keys',
      description: 'No registration required. Just use the endpoints',
    },
  ]

  const endpoints = [
    { path: '/api/x402', method: 'GET', description: 'Facilitator info' },
    { path: '/api/x402/verify', method: 'POST', description: 'Verify payments' },
    { path: '/api/x402/settle', method: 'POST', description: 'Settle & record reputation' },
    { path: '/api/x402/resources', method: 'GET', description: 'Discover resources' },
    { path: '/api/x402/health', method: 'GET', description: 'Health check' },
  ]

  return (
    <section className="py-16 sm:py-24 md:py-32 relative overflow-hidden border-t border-border">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-4 uppercase tracking-wider">
            <Server className="w-3 h-3" />
            x402 Facilitator
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-4">
            Production-Ready{' '}
            <span className="text-primary">x402 Facilitator</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            GhostSpeak operates a public x402 facilitator at{' '}
            <code className="text-primary bg-primary/10 px-2 py-0.5 rounded">www.ghostspeak.io</code>.
            No API keys required.
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Features */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <GhostIcon variant="outline" size={24} className="text-primary" />
              Facilitator Features
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl bg-background/50 border border-border hover:border-primary/30 transition-colors"
                >
                  <feature.icon className="w-5 h-5 text-primary mb-2" />
                  <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* API Endpoints */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8"
          >
            <h3 className="text-xl font-bold mb-6">API Endpoints</h3>
            <div className="space-y-3">
              {endpoints.map((endpoint, index) => (
                <motion.div
                  key={endpoint.path}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border"
                >
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      endpoint.method === 'GET'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-xs font-mono text-foreground flex-1">{endpoint.path}</code>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {endpoint.description}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-2">Base URL:</p>
              <code className="text-sm font-mono text-primary">https://www.ghostspeak.io</code>
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Listed on the official x402 ecosystem alongside PayAI, CDP, and ThirdWeb
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/x402/discover"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Explore Marketplace
            </a>
            <a
              href="https://x402.org/ecosystem"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-border font-semibold text-sm hover:border-primary/50 transition-colors"
            >
              x402 Ecosystem
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
