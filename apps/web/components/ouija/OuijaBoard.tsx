'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Board Layout Constants
const LETTER_ARC_RADIUS = 300
const NUMBER_LINE_Y = 150

interface SpiritInternal {
  spiritShort: string
  spiritLong: string
  reliability: 'Trustworthy' | 'Deceptive' | 'Unknown'
}

interface ReportData {
  summary: SpiritInternal
  reputation?: any
  reports: any[]
  transactions: any[]
}

interface OuijaBoardProps {
  agentAddress?: string
  summary?: any
  reputation?: any
  reports?: any[]
  transactions?: any[]
}

export default function OuijaBoard({
  agentAddress: initialAddress = '',
  summary,
  reputation,
  reports,
  transactions,
}: OuijaBoardProps) {
  const [address, setAddress] = useState(initialAddress)
  const [isSummoning, setIsSummoning] = useState(false)
  const [report, setReport] = useState<ReportData | null>(
    summary
      ? { summary, reputation, reports: reports || [], transactions: transactions || [] }
      : null
  )
  const [spellingMessage, setSpellingMessage] = useState<string | null>(null)
  const [currentLetter, setCurrentLetter] = useState<string | null>(null)

  const generateOuijaReport = useAction(api.reports.generateOuijaReport)
  const boardRef = useRef<HTMLDivElement>(null)

  // Start spelling message if report is provided initially
  useEffect(() => {
    if (summary?.spiritShort && !spellingMessage && !isSummoning) {
      setTimeout(() => {
        setSpellingMessage(summary.spiritShort.toUpperCase())
      }, 1000)
    }
  }, [summary])

  const handleSummon = async () => {
    if (!address) return
    setIsSummoning(true)
    setReport(null)
    setSpellingMessage(null)

    try {
      const data = await generateOuijaReport({ agentAddress: address })
      setReport(data as ReportData)

      // Start spelling out the "Spirit Short" title after a short delay
      setTimeout(() => {
        setSpellingMessage(data.summary.spiritShort.toUpperCase())
      }, 1000)
    } catch (error) {
      console.error('Summoning failed:', error)
    } finally {
      setIsSummoning(false)
    }
  }

  // --- Animation Logic ---
  // Coordinate map for letters/numbers
  const getCoordinates = (char: string) => {
    if (!boardRef.current) return { x: 0, y: 0 }

    const width = boardRef.current.offsetWidth
    const centerX = width / 2

    // YES / NO
    if (char === 'YES') return { x: centerX - 100, y: 40 }
    if (char === 'NO') return { x: centerX + 100, y: 40 }
    if (char === 'GOODBYE') return { x: centerX, y: 350 }
    if (char === ' ') return { x: centerX, y: 200 } // Rest center

    // Numbers 0-9
    const num = parseInt(char)
    if (!isNaN(num)) {
      const spacing = 40
      return { x: centerX - 180 + num * spacing, y: NUMBER_LINE_Y }
    }

    // Letters A-Z (Arc)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const index = alphabet.indexOf(char)
    if (index !== -1) {
      // Semi-circle arc logic
      const angleStep = Math.PI / (alphabet.length - 1) // Spread over 180 degrees
      const angle = Math.PI - index * angleStep // Start from left (180deg / PI radians)
      // Adjust angle to be roughly centered arc (e.g. from 160deg to 20deg)
      const spreadLimit = 2.5 // rad
      const startParams = (Math.PI - spreadLimit) / 2
      const adjustedAngle = Math.PI - startParams - index * (spreadLimit / (alphabet.length - 1))

      return {
        x: centerX + Math.cos(adjustedAngle) * LETTER_ARC_RADIUS,
        y: 280 - Math.sin(adjustedAngle) * LETTER_ARC_RADIUS,
      }
    }

    return { x: centerX, y: 200 } // Default center
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full max-w-4xl mx-auto p-4">
      {/* Controls - Only show if not pre-populated */}
      {!summary && (
        <div className="mb-8 w-full max-w-lg z-20">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter Entity Address (Wallet)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-black/50 border-white/20 text-white placeholder:text-white/30 font-serif"
            />
            <Button
              onClick={handleSummon}
              disabled={isSummoning || !address}
              className="bg-purple-900/80 hover:bg-purple-800 text-purple-100 border border-purple-500/50 font-serif"
            >
              {isSummoning ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              SUMMON
            </Button>
          </div>
        </div>
      )}

      {/* The Board */}
      <div
        ref={boardRef}
        className="relative w-full aspect-[4/3] bg-[url('/wood-texture.jpg')] bg-stone-900 rounded-lg shadow-2xl border-8 border-stone-800 overflow-hidden select-none font-serif text-stone-400"
      >
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        {/* YES / NO */}
        <div className="absolute top-10 left-[20%] text-3xl font-bold opacity-80">YES</div>
        <div className="absolute top-10 right-[20%] text-3xl font-bold opacity-80">NO</div>

        {/* Alphabet Arc */}
        <div className="absolute top-[30%] w-full text-center">
          {/* Visually approximated arc for static display - real coordinates used for planchette */}
          <div className="text-4xl font-bold tracking-[1em] text-stone-300/50 opacity-50 scale-x-125 origin-bottom">
            A B C D E F G H I J K L M
          </div>
          <div className="mt-4 text-4xl font-bold tracking-[1em] text-stone-300/50 opacity-50 scale-x-125 origin-bottom">
            N O P Q R S T U V W X Y Z
          </div>
        </div>

        {/* Numbers */}
        <div className="absolute top-[55%] w-full flex justify-center space-x-8 text-2xl font-bold opacity-60">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>

        {/* GOODBYE */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-3xl font-bold opacity-80">
          GOODBYE
        </div>

        {/* Planchette */}
        <Planchette
          boardRef={boardRef}
          targetMessage={spellingMessage}
          getCoordinates={getCoordinates}
          onComplete={() => setSpellingMessage(null)}
        />
      </div>

      {/* Results Card */}
      <AnimatePresence>
        {report && !spellingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 bg-black/80 border border-purple-500/30 rounded-lg max-w-2xl w-full text-center font-serif"
          >
            <h2 className="text-3xl text-purple-300 mb-2">{report.summary.spiritShort}</h2>
            <p className="text-gray-400 italic mb-4">"{report.summary.spiritLong}"</p>

            <div className="grid grid-cols-2 gap-4 text-sm text-left border-t border-purple-900/50 pt-4">
              <div>
                <span className="text-gray-500 block">Nature</span>
                <span
                  className={cn(
                    'text-lg',
                    report.summary.reliability === 'Trustworthy'
                      ? 'text-green-400'
                      : report.summary.reliability === 'Deceptive'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                  )}
                >
                  {report.summary.reliability}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Ghost Score</span>
                <span className="text-lg text-purple-200">
                  {report.reputation?.ghostScore || 'N/A'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Planchette({
  boardRef,
  targetMessage,
  getCoordinates,
  onComplete,
}: {
  boardRef: any
  targetMessage: string | null
  getCoordinates: (c: string) => { x: number; y: number }
  onComplete: () => void
}) {
  const [coords, setCoords] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!targetMessage || !boardRef.current) return

    let currentIndex = 0
    const width = boardRef.current.offsetWidth
    const initial = { x: width / 2, y: 200 }
    setCoords(initial)

    const moveNext = () => {
      if (currentIndex >= targetMessage.length) {
        // Return to center or Goodbye
        setCoords(initial)
        setTimeout(onComplete, 1000)
        return
      }

      const char = targetMessage[currentIndex]
      const nextCoords = getCoordinates(char)

      // Random jitter for realism
      const jitterX = (Math.random() - 0.5) * 10
      const jitterY = (Math.random() - 0.5) * 10

      setCoords({ x: nextCoords.x + jitterX, y: nextCoords.y + jitterY })

      currentIndex++
      setTimeout(moveNext, 1200) // Speed of spelling
    }

    // Start delay
    setTimeout(moveNext, 500)
  }, [targetMessage])

  // Initial center position on mount
  useEffect(() => {
    if (boardRef.current && !targetMessage) {
      setCoords({ x: boardRef.current.offsetWidth / 2, y: 200 })
    }
  }, [boardRef.current, targetMessage])

  return (
    <motion.div
      className="absolute w-32 h-40 pointer-events-none z-10"
      animate={{ x: coords.x - 64, y: coords.y - 80 }} // Center the 128x160 planchette
      transition={{ type: 'spring', stiffness: 50, damping: 15 }}
    >
      {/* Visual Planchette shape */}
      <svg viewBox="0 0 100 130" className="w-full h-full drop-shadow-2xl opacity-90">
        <path
          d="M50 0 C 80 0, 100 30, 100 60 C 100 100, 50 130, 50 130 C 50 130, 0 100, 0 60 C 0 30, 20 0, 50 0"
          fill="#fefbd8"
          stroke="#4a3b2a"
          strokeWidth="2"
        />
        <circle cx="50" cy="50" r="15" fill="none" stroke="#4a3b2a" strokeWidth="2" />
        {/* Viewing window */}
        <circle cx="50" cy="50" r="12" fill="rgba(0,0,0,0.1)" />
      </svg>
    </motion.div>
  )
}
