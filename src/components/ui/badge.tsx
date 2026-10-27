import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { SUBJECT_COLOR_CLASSES, SUBJECT_DOT_CLASSES, subjectById } from '@/data/syllabus'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary ring-primary/20',
        secondary: 'bg-secondary text-secondary-foreground ring-border',
        outline: 'bg-transparent text-foreground ring-border',
        destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
        success: 'bg-success/10 text-success ring-success/20',
        warning: 'bg-warning/20 text-warning-foreground ring-warning/30 dark:text-warning',
        muted: 'bg-muted text-muted-foreground ring-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export function SubjectChip({
  subjectId,
  className,
  size = 'sm',
}: {
  subjectId: string | null | undefined
  className?: string
  size?: 'sm' | 'xs'
}) {
  if (!subjectId) return null
  const subject = subjectById[subjectId]
  if (!subject) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-px text-[11px]',
        SUBJECT_COLOR_CLASSES[subject.color],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', SUBJECT_DOT_CLASSES[subject.color])} aria-hidden />
      {subject.name}
    </span>
  )
}
