import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:ring-offset-gray-950 dark:focus-visible:ring-purple-300',
  {
    variants: {
      variant: {
        default:
          'bg-[#8b5cf6] text-white hover:bg-[#7c3aed] shadow-soft hover:shadow-soft-md dark:bg-[#a78bfa] dark:hover:bg-[#8b5cf6]',
        destructive:
          'bg-[#f87171] text-white hover:bg-[#ef4444] shadow-soft hover:shadow-soft-md dark:bg-red-900 dark:hover:bg-red-800',
        outline:
          'border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-purple-200 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800',
        secondary:
          'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700',
        ghost:
          'hover:bg-purple-50 hover:text-purple-900 dark:hover:bg-purple-900/20 dark:hover:text-purple-100',
        link: 'text-purple-600 underline-offset-4 hover:underline dark:text-purple-400',
        gradient:
          'bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] text-white hover:from-[#7c3aed] hover:to-[#8b5cf6] shadow-soft-lg hover:shadow-soft-md transition-all duration-200',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
