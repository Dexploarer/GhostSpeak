import React from 'react'
import { 
  BookOpen, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Layout, 
  FileCode, 
  BarChart3,
  Terminal
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon?: React.ReactNode
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
        icon: <BookOpen className="w-4 h-4" />,
      },
      {
        title: 'Quick Start',
        href: '/docs/quickstart',
        icon: <Zap className="w-4 h-4" />,
      },
      {
        title: 'Deployment',
        href: '/docs/deployment',
        icon: <Terminal className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'Architecture',
    items: [
      {
        title: 'Overview',
        href: '/docs/architecture',
        icon: <Layout className="w-4 h-4" />,
      },
      {
        title: 'x402 Protocol',
        href: '/docs/x402-protocol',
        icon: <ShieldCheck className="w-4 h-4" />,
      },
      {
        title: 'Privacy Layer',
        href: '/docs/privacy',
        icon: <ShieldCheck className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'API & SDK',
    items: [
      {
        title: 'SDK Reference',
        href: '/docs/sdk',
        icon: <FileCode className="w-4 h-4" />,
      },
      {
        title: 'API Endpoints',
        href: '/docs/api',
        icon: <Cpu className="w-4 h-4" />,
      },
      {
        title: 'Examples',
        href: '/docs/examples',
        icon: <FileCode className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        title: 'Network Report',
        href: '/docs/network-readiness',
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        title: 'Security Audit',
        href: '/docs/security',
        icon: <ShieldCheck className="w-4 h-4" />,
      },
    ],
  },
]

export const flatDocsConfig = docsConfig.flatMap((section) => section.items)
