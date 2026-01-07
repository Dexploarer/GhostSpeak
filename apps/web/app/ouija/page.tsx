import OuijaBoard from '@/components/ouija/OuijaBoard'

export default function OuijaPage() {
  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center">
      <header className="mb-8 mt-4 text-center">
        <h1 className="text-4xl font-serif text-purple-500 mb-2">The Digital Séance</h1>
        <p className="text-stone-500">Commune with the spirits of the blockchain</p>
      </header>

      <main className="w-full">
        <OuijaBoard />
      </main>

      <footer className="mt-12 text-stone-700 font-serif text-sm">
        GhostSpeak Protocol © 2025
      </footer>
    </div>
  )
}
