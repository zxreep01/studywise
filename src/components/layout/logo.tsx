import { Link } from 'react-router'
import { cn } from '@/lib/utils'

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 rounded-lg', className)} aria-label="StudyWise home">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-soft">
        <svg viewBox="0 0 512 512" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round">
          <path d="M256 150 L120 212 L256 274 L392 212 Z" />
          <path d="M176 246 V318 Q256 372 336 318 V246" />
          <path d="M392 212 V300" />
        </svg>
      </span>
      {!compact && <span className="text-lg font-bold tracking-tight">StudyWise</span>}
    </Link>
  )
}
