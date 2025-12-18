'use client'

import React, { createContext, useContext } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Context for sharing query across components
const OpenInContext = createContext<string>('')

// Platform configurations
const platforms = {
  chatgpt: {
    name: 'ChatGPT',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
      </svg>
    ),
    getUrl: (query: string) =>
      `https://chatgpt.com/?hints=search&q=${encodeURIComponent(query)}`,
  },
  claude: {
    name: 'Claude',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.444-.12-2.26-.255c-.523-.058-.87-.263-.957-.652-.05-.24.003-.45.206-.748l.453-.575c.41-.442.973-.778 1.682-.892l3.735-.602.218-.166-.038-.185-.34-.217-5.324-.397c-.385-.017-.657-.147-.788-.385-.149-.268-.1-.582.15-.966.343-.526.957-.995 1.66-1.237l3.422-1.18.253-.206-.074-.173-.46-.044-4.013.12c-.402.023-.658-.046-.825-.228-.196-.213-.222-.526-.06-.923.235-.582.838-1.216 1.572-1.617l.986-.539c.696-.38 1.557-.494 2.31-.414l3.586.386.27-.194-.155-.247-.578-.373L9.91 1.08c-.26-.154-.426-.324-.472-.526-.064-.282.095-.5.451-.675C10.453-.375 11.355-.36 12.1.11l2.95 1.87.224.038.164-.092.076-.28L15.8.293c.035-.241.148-.393.365-.455.25-.072.514.006.846.238.516.36.99.973 1.297 1.65l1.37 3.038.228.114.169-.048.32-.51c.235-.356.478-.504.776-.436.188.043.341.176.462.404.21.396.28.932.19 1.497l-.616 3.796.097.23.218.029.8-.803c.32-.308.577-.418.863-.326.181.058.317.19.402.408.131.334.121.778-.024 1.276l-1.55 5.264.038.219.24.083.652-.227c.413-.142.704-.12.93.092.124.117.186.274.186.477 0 .372-.176.824-.48 1.274l-2.167 3.21-.009.236.194.14.815.063c.39.037.614.167.72.404.106.236.06.496-.13.825-.313.544-.902 1.084-1.574 1.412l-4.239 2.073-.09.228.112.178.38.145 4.72.555c.405.04.654.172.77.42.133.285.068.57-.236.9-.462.5-1.24.87-2.069.997l-6.401.978-.128.167.029.249 2.062 1.817c.32.29.45.536.402.816-.052.304-.288.472-.757.503-.638.043-1.49-.174-2.244-.572l-4.03-2.125-.259.04-.118.22.59 2.317c.086.41.046.694-.168.878-.197.17-.434.182-.762.044-.515-.217-1.045-.669-1.447-1.21l-2.3-3.103-.257-.073-.15.16-.255 1.672c-.07.42-.218.65-.486.716-.305.074-.557-.077-.813-.427-.38-.52-.62-1.253-.67-1.978l-.278-4.029-.194-.173-.228.043-1.46 1.64c-.3.327-.558.457-.846.384-.29-.074-.455-.308-.487-.68-.046-.533.148-1.205.5-1.811l2.13-3.672-.011-.256-.217-.154-.936.009c-.39.007-.645-.102-.796-.339-.177-.277-.167-.58.058-.958.316-.533.917-1.015 1.583-1.282z" />
      </svg>
    ),
    getUrl: (query: string) => `https://claude.ai/new?q=${encodeURIComponent(query)}`,
  },
  t3chat: {
    name: 'T3 Chat',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">
          T3
        </text>
      </svg>
    ),
    getUrl: (query: string) => `https://t3.chat/new?q=${encodeURIComponent(query)}`,
  },
  scira: {
    name: 'Scira AI',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    ),
    getUrl: (query: string) => `https://scira.ai/search?q=${encodeURIComponent(query)}`,
  },
  v0: {
    name: 'v0',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 19h20L12 2zm0 4l7 11H5l7-11z" />
      </svg>
    ),
    getUrl: (query: string) => `https://v0.dev/chat?q=${encodeURIComponent(query)}`,
  },
  cursor: {
    name: 'Cursor',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z" />
      </svg>
    ),
    getUrl: (query: string) => `cursor://open?q=${encodeURIComponent(query)}`,
  },
} as const

type Platform = keyof typeof platforms

// Main Container Component
interface OpenInProps extends React.ComponentProps<typeof DropdownMenu> {
  query: string
}

export function OpenIn({ query, children, ...props }: OpenInProps) {
  return (
    <OpenInContext.Provider value={query}>
      <DropdownMenu {...props}>{children}</DropdownMenu>
    </OpenInContext.Provider>
  )
}

// Trigger Component
interface OpenInTriggerProps extends React.ComponentProps<typeof DropdownMenuTrigger> {
  children?: React.ReactNode
}

export function OpenInTrigger({ children, className, ...props }: OpenInTriggerProps) {
  return (
    <DropdownMenuTrigger
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg',
        'bg-muted/50 hover:bg-muted border border-border hover:border-primary/30',
        'text-muted-foreground hover:text-foreground transition-all',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <span>Open in chat</span>
          <ChevronDown className="w-4 h-4" />
        </>
      )}
    </DropdownMenuTrigger>
  )
}

// Content Component
interface OpenInContentProps extends React.ComponentProps<typeof DropdownMenuContent> {}

export function OpenInContent({ className, children, ...props }: OpenInContentProps) {
  return (
    <DropdownMenuContent
      align="end"
      className={cn('w-56', className)}
      {...props}
    >
      {children}
    </DropdownMenuContent>
  )
}

// Individual Platform Items
function createPlatformItem(platform: Platform) {
  const config = platforms[platform]

  const PlatformItem = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<typeof DropdownMenuItem>
  >(({ className, ...props }, ref) => {
    const query = useContext(OpenInContext)

    return (
      <DropdownMenuItem
        ref={ref}
        className={cn('cursor-pointer', className)}
        onClick={() => window.open(config.getUrl(query), '_blank')}
        {...props}
      >
        <span className="flex items-center gap-2 flex-1">
          {config.icon}
          {config.name}
        </span>
        <ExternalLink className="w-3 h-3 text-muted-foreground" />
      </DropdownMenuItem>
    )
  })
  PlatformItem.displayName = `OpenIn${config.name.replace(/\s/g, '')}`

  return PlatformItem
}

export const OpenInChatGPT = createPlatformItem('chatgpt')
export const OpenInClaude = createPlatformItem('claude')
export const OpenInT3 = createPlatformItem('t3chat')
export const OpenInScira = createPlatformItem('scira')
export const OpenInv0 = createPlatformItem('v0')
export const OpenInCursor = createPlatformItem('cursor')

// Re-export utility components
export const OpenInItem = DropdownMenuItem
export const OpenInLabel = DropdownMenuLabel
export const OpenInSeparator = DropdownMenuSeparator

// Pre-composed default dropdown for convenience
interface OpenInChatProps {
  query: string
  className?: string
}

export function OpenInChat({ query, className }: OpenInChatProps) {
  return (
    <OpenIn query={query}>
      <OpenInTrigger className={className} />
      <OpenInContent>
        <OpenInLabel>Open in AI Chat</OpenInLabel>
        <OpenInSeparator />
        <OpenInChatGPT />
        <OpenInClaude />
        <OpenInT3 />
        <OpenInScira />
        <OpenInSeparator />
        <OpenInLabel className="text-[10px] text-muted-foreground font-normal">
          Developer Tools
        </OpenInLabel>
        <OpenInv0 />
        <OpenInCursor />
      </OpenInContent>
    </OpenIn>
  )
}
