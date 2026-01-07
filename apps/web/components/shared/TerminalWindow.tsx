import { ReactNode } from 'react'

interface TerminalWindowProps {
  title?: string
  children: ReactNode
  className?: string
  glow?: boolean
}

export function TerminalWindow({
  title = 'terminal',
  children,
  className = '',
  glow = true,
}: TerminalWindowProps) {
  return (
    <div
      className={`relative rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl ${className}`}
    >
      {/* Code editor header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-zinc-400 font-mono ml-2 opacity-60">{title}</span>
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Glow effect */}
      {glow && (
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      )}
    </div>
  )
}
