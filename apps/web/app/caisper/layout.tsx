export const metadata = {
  title: 'Caisper - AI Trust Verification Agent',
  description:
    'AI-powered credential verification and reputation checking for the AI agent ecosystem',
}

export default function CaisperLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-[rgb(29,29,29)]">
        {/* Main content */}
        <div className="relative z-10 h-screen">{children}</div>
      </div>
    </>
  )
}
