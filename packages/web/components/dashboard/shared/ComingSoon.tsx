'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Construction, Sparkles, ArrowLeft, BookOpen, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ComingSoonProps {
  title: string
  description?: string
  icon?: LucideIcon
  features?: string[]
}

export function ComingSoon({ 
  title, 
  description, 
  icon: Icon = Construction,
  features = []
}: ComingSoonProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg mx-auto"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="relative inline-block mb-8"
        >
          <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_60px_-10px_rgba(204,255,0,0.4)]">
            <Icon className="w-12 h-12 text-primary" />
          </div>
          {/* Floating badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-3xl font-black text-foreground mb-4"
        >
          {title}
        </motion.h1>

        {/* Coming Soon Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-bold text-primary uppercase tracking-wide">Coming Soon</span>
        </motion.div>

        {/* Description */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-muted-foreground mb-8 leading-relaxed"
        >
          {description ?? 'This feature is currently under development and will be available in a future release.'}
        </motion.p>

        {/* Features Preview */}
        {features.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8 p-4 rounded-2xl bg-muted/30 border border-border text-left"
          >
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 block">Planned Features</span>
            <ul className="space-y-2">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Network Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border mb-8"
        >
          <span className="text-[10px] font-mono text-muted-foreground">DEVNET • TESTNET COMING</span>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link href="/dashboard">
            <Button variant="outline" className="w-full sm:w-auto font-bold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/docs">
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_20px_rgba(204,255,0,0.2)]">
              <BookOpen className="w-4 h-4 mr-2" />
              View Documentation
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
