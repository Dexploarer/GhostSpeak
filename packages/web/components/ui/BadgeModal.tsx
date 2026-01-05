import { BadgeDefinition } from '@/lib/badges/definitions'
import { X, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface BadgeDetailsModalProps {
  badge: BadgeDefinition | null
  onClose: () => void
}

export function BadgeDetailsModal({ badge, onClose }: BadgeDetailsModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!badge) return null

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return 'text-amber-400 border-amber-400/50 bg-amber-400/10'
      case 'EPIC': return 'text-purple-400 border-purple-400/50 bg-purple-400/10'
      case 'RARE': return 'text-blue-400 border-blue-400/50 bg-blue-400/10'
      case 'UNCOMMON': return 'text-green-400 border-green-400/50 bg-green-400/10'
      default: return 'text-gray-400 border-gray-400/50 bg-gray-400/10'
    }
  }

  const rarityColor = getRarityColor(badge.rarity)
  const Icon = badge.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal ID Card Style */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header Gradient */}
        <div className={`h-24 w-full bg-linear-to-br ${rarityColor.replace('bg-', 'from-').replace('text-', '').split(' ')[0]}/20 to-transparent`} />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        <div className="px-6 pb-6 -mt-10 relative">
          {/* Badge Icon */}
          <div className={`w-20 h-20 rounded-xl border-2 ${rarityColor} bg-black flex items-center justify-center shadow-lg mb-4`}>
            <Icon className={`w-10 h-10 ${rarityColor.split(' ')[0]}`} />
          </div>

          <div className="space-y-1 mb-6">
            <h3 className="text-xl font-bold text-white">{badge.name}</h3>
            <div className={`text-xs font-bold tracking-wider px-2 py-0.5 rounded-full w-fit ${rarityColor}`}>
              {badge.rarity} {badge.type}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold">Description</h4>
              <p className="text-sm text-white/90 leading-relaxed">{badge.description}</p>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold">Requirement</h4>
              <p className="text-sm text-white/90 leading-relaxed">{badge.howToGet}</p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h4 className="text-xs uppercase tracking-wider text-cyan-400 font-semibold mb-2 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                 Significance
              </h4>
              <p className="text-sm text-gray-300 italic">"{badge.meaning}"</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
