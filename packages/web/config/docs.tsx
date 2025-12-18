import { 
  BookOpen, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Layout, 
  FileCode, 
  BarChart3,
  Terminal,
  type LucideIcon
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon?: LucideIcon
  label?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const docsConfig: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        title: 'Introduction',
        href: '/docs',
        icon: BookOpen,
      },
      {
        title: 'Quick Start',
        href: '/docs/quickstart',
        icon: Zap,
      },
      {
        title: 'Deployment',
        href: '/docs/deployment',
        icon: Terminal,
      },
    ],
  },
  {
    title: 'Architecture',
    items: [
      {
        title: 'Overview',
        href: '/docs/architecture',
        icon: Layout,
      },
      {
        title: 'x402 Protocol',
        href: '/docs/x402-protocol',
        icon: ShieldCheck,
      },
      {
        title: 'Privacy Layer',
        href: '/docs/privacy',
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: 'API & SDK',
    items: [
      {
        title: 'SDK Reference',
        href: '/docs/sdk',
        icon: FileCode,
      },
      {
        title: 'API Endpoints',
        href: '/docs/api',
        icon: Cpu,
      },
      {
        title: 'Examples',
        href: '/docs/examples',
        icon: FileCode,
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        title: 'Network Report',
        href: '/docs/network-readiness',
        icon: BarChart3,
      },
      {
        title: 'Security Audit',
        href: '/docs/security',
        icon: ShieldCheck,
      },
    ],
  },
]

export const flatDocsConfig = docsConfig.flatMap((section) => section.items)
