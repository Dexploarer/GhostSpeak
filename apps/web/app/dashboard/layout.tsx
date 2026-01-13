// Disable static generation for all dashboard routes
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="pt-24 min-h-screen">{children}</div>
}
