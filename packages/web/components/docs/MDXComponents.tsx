import React from 'react'
import { cn } from '@/lib/utils'
import { GhostIcon } from '@/components/shared/GhostIcon'
import { StatusLabel } from '@/components/shared/StatusLabel'
import { Zap, Shield, X, ShieldCheck } from 'lucide-react'

export const MDXComponents = {
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className={cn(
        "mt-2 scroll-m-20 text-4xl font-bold tracking-tight text-foreground md:text-5xl",
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')}
      className={cn(
        "mt-10 scroll-m-20 border-b border-border pb-2 text-2xl font-semibold tracking-tight text-foreground first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')}
      className={cn(
        "mt-8 scroll-m-20 text-xl font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className={cn("leading-7 not-first:mt-6 text-muted-foreground", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)} {...props} />
  ),
  ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className={cn("my-6 ml-6 list-decimal [&>li]:mt-2", className)} {...props} />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className={cn("mt-2 text-muted-foreground font-medium", className)} {...props} />
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className={cn(
        "mt-6 border-l-2 border-primary pl-6 italic text-muted-foreground bg-muted/30 py-4 pr-4 rounded-r-lg",
        className
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-foreground border border-border/50",
        className
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className={cn(
        "mb-4 mt-6 overflow-x-auto rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 shadow-sm",
        className
      )}
      {...props}
    />
  ),
  Callout: ({ children, variant = 'info' }: { children: React.ReactNode, variant?: 'info' | 'warning' | 'danger' | 'success' }) => {
    const variants = {
      info: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300',
      warning: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
      danger: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300',
      success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    }
    return (
      <div className={cn("my-6 flex items-start gap-4 rounded-xl border p-4", variants[variant])}>
        <div className="mt-1 shrink-0">
          {variant === 'info' && <Zap className="w-5 h-5" />}
          {variant === 'warning' && <Shield className="w-5 h-5" />}
          {variant === 'danger' && <X className="w-5 h-5" />}
          {variant === 'success' && <ShieldCheck className="w-5 h-5" />}
        </div>
        <div className="flex-1 text-sm leading-relaxed">{children}</div>
      </div>
    )
  },
  GhostIcon: () => (
    <div className="inline-block mr-2 align-middle">
      <GhostIcon size={24} />
    </div>
  ),
  Status: ({ label, value, variant }: any) => (
    <div className="inline-block mx-2">
      <StatusLabel label={label} value={value} variant={variant} />
    </div>
  ),
}
