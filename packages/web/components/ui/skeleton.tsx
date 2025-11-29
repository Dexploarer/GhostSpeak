import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100 dark:from-purple-900/20 dark:via-purple-800/20 dark:to-purple-900/20 bg-[length:200%_100%] animate-shimmer',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
