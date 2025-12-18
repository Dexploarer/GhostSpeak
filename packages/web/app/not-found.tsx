import Link from 'next/link'

// This is a Server Component - no 'use client' needed
// It must be simple and not rely on client-side features
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="text-center max-w-md">
        {/* 404 Number */}
        <h1 className="text-[120px] font-black leading-none text-lime-400/20">
          404
        </h1>
        
        {/* Message */}
        <h2 className="text-2xl font-bold text-white mt-4 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-400 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        
        {/* Actions - using simple anchor tags for static generation */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-lime-400 text-gray-900 font-bold hover:bg-lime-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </Link>
        </div>
        
        {/* Network indicator */}
        <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700">
          <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
          <span className="text-xs font-mono text-gray-400">GhostSpeak • Devnet</span>
        </div>
      </div>
    </div>
  )
}
