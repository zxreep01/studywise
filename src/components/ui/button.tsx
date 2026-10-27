import * as React from 'react'
import { Slot } from 'radix-ui'
import type { VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button-variants'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }))
    if (asChild) {
      // Slot requires exactly one element child, so the loading spinner is not supported here.
      return (
        <Slot.Root className={classes} ref={ref} {...props}>
          {children}
        </Slot.Root>
      )
    }
    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        type={props.type ?? 'button'}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
