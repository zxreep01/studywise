import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, CheckCircle2, Layers, RotateCcw } from 'lucide-react'
import { db, type Flashcard } from '@/lib/db'
import { GRADES, isDue, previewIntervals, Rating, reviewCard, type Grade } from '@/lib/fsrs'
import { cn, pluralize } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmptyState, Kbd, Progress } from '@/components/ui/misc'

type Phase = 'loading' | 'front' | 'back' | 'done' | 'empty'

export default function ReviewPage() {
  const { deckId } = useParams()
  const [queue, setQueue] = useState<Flashcard[]>([])
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 })
  const [deckTitle, setDeckTitle] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const [elapsedMin, setElapsedMin] = useState(0)
  const startedAt = useRef(0)
  const revealButtonRef = useRef<HTMLButtonElement>(null)
  const goodButtonRef = useRef<HTMLButtonElement>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cards = deckId ? await db.cards.where('deckId').equals(deckId).toArray() : await db.cards.toArray()
      const deck = deckId ? await db.decks.get(deckId) : undefined
      if (cancelled) return
      const due = cards.filter((c) => isDue(c)).sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
      setDeckTitle(deck?.title ?? null)
      setQueue(due)
      setTotal(due.length)
      setIndex(0)
      setCounts({ again: 0, hard: 0, good: 0, easy: 0 })
      startedAt.current = Date.now()
      setPhase(due.length ? 'front' : 'empty')
    })()
    return () => {
      cancelled = true
    }
  }, [deckId, reloadKey])

  const reload = () => {
    setPhase('loading')
    setReloadKey((k) => k + 1)
  }

  const current = queue[index]

  const grade = useCallback(
    async (g: Grade) => {
      if (!current || phase !== 'back') return
      const updated = await reviewCard(current, g)
      setCounts((c) => ({
        ...c,
        again: c.again + (g === Rating.Again ? 1 : 0),
        hard: c.hard + (g === Rating.Hard ? 1 : 0),
        good: c.good + (g === Rating.Good ? 1 : 0),
        easy: c.easy + (g === Rating.Easy ? 1 : 0),
      }))
      // Short learning steps (minutes) come back in the same session.
      const dueSoon = new Date(updated.due).getTime() - Date.now() < 10 * 60 * 1000
      setQueue((q) => {
        const next = [...q]
        if (dueSoon) next.push(updated)
        return next
      })
      const label = GRADES.find((x) => x.grade === g)?.label ?? ''
      setAnnounce(`Marked ${label}.`)
      const nextIndex = index + 1
      if (nextIndex >= queue.length + (dueSoon ? 1 : 0)) {
        setElapsedMin(Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)))
        setPhase('done')
      } else {
        setIndex(nextIndex)
        setPhase('front')
      }
    },
    [current, phase, index, queue.length],
  )

  // Keep keyboard focus on the primary action as the card flips.
  useEffect(() => {
    if (phase === 'front') revealButtonRef.current?.focus()
    if (phase === 'back') goodButtonRef.current?.focus()
  }, [phase, index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (phase === 'front' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setPhase('back')
        return
      }
      if (phase === 'back') {
        const g = GRADES.find((x) => x.key === e.key)
        if (g) {
          e.preventDefault()
          grade(g.grade)
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          grade(Rating.Good)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, grade])

  const backHref = deckId ? `/flashcards/${deckId}` : '/flashcards'
  const reviewedSoFar = counts.again + counts.hard + counts.good + counts.easy
  const progress = queue.length ? Math.round((reviewedSoFar / Math.max(queue.length, total)) * 100) : 0

  if (phase === 'loading') {
    return <div className="mx-auto h-80 max-w-2xl animate-pulse rounded-2xl bg-muted" aria-busy="true" />
  }

  if (phase === 'empty') {
    return (
      <div className="mx-auto max-w-2xl">
        <BackLink href={backHref} />
        <EmptyState
          icon={CheckCircle2}
          title="Nothing due right now"
          description="You’re up to date. New cards and cards you’ve learnt will come back when the scheduler thinks you’re about to forget them."
          action={
            <Button asChild variant="outline">
              <Link to={backHref}>
                <Layers aria-hidden /> Back to {deckTitle ?? 'decks'}
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (phase === 'done') {
    const minutes = elapsedMin
    const retention = reviewedSoFar ? Math.round(((reviewedSoFar - counts.again) / reviewedSoFar) * 100) : 0
    return (
      <div className="mx-auto max-w-2xl">
        <BackLink href={backHref} />
        <div className="rounded-2xl border bg-card p-8 text-center shadow-soft animate-slide-up">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="size-7" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Session complete</h1>
          <p className="mt-1 text-muted-foreground">
            {pluralize(reviewedSoFar, 'review')} in about {pluralize(minutes, 'minute')} · {retention}% recalled
          </p>
          <dl className="mx-auto mt-6 grid max-w-sm grid-cols-4 gap-2 text-center">
            {GRADES.map((g) => (
              <div key={g.grade} className="rounded-xl bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">{g.label}</dt>
                <dd className="text-xl font-bold tabular-nums">{counts[g.label.toLowerCase() as keyof typeof counts]}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild>
              <Link to={backHref}>Back to {deckTitle ?? 'decks'}</Link>
            </Button>
            <Button variant="outline" onClick={reload}>
              <RotateCcw aria-hidden /> Check for more
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const intervals = current ? previewIntervals(current) : null

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <BackLink href={backHref} className="mb-0" />
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {reviewedSoFar + 1} / {Math.max(queue.length, total)}
        </p>
      </div>
      <Progress value={progress} aria-label="Review progress" className="mb-6" />

      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      {current ? (
        <article
          key={`${current.id}-${index}`}
          className="rounded-2xl border bg-card shadow-soft animate-slide-up"
          aria-label={phase === 'front' ? 'Flashcard question' : 'Flashcard answer'}
        >
          <div className="px-6 pt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {phase === 'front' ? 'Question' : 'Answer'}
          </div>
          <div className="px-6 py-6 md:px-10 md:py-8">
            <p className="whitespace-pre-wrap text-xl font-semibold leading-snug md:text-2xl">{current.front}</p>
            {phase === 'back' ? (
              <>
                <hr className="my-6" />
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-foreground md:text-xl">{current.back}</p>
              </>
            ) : null}
          </div>
          <div className="border-t p-4">
            {phase === 'front' ? (
              <Button ref={revealButtonRef} size="lg" className="w-full" onClick={() => setPhase('back')}>
                Show answer <Kbd className="ml-1 bg-primary-foreground/20 text-primary-foreground">Space</Kbd>
              </Button>
            ) : (
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="How well did you remember?">
                {GRADES.map((g) => (
                  <button
                    key={g.grade}
                    type="button"
                    ref={g.grade === Rating.Good ? goodButtonRef : undefined}
                    onClick={() => grade(g.grade)}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-3 text-sm font-semibold transition-[transform,background-color] active:scale-[0.97]',
                      g.tone === 'destructive' && 'border-destructive/30 text-destructive hover:bg-destructive/10',
                      g.tone === 'warning' && 'border-warning/50 text-warning-foreground hover:bg-warning/20 dark:text-warning',
                      g.tone === 'primary' && 'border-primary/40 text-primary hover:bg-primary/10',
                      g.tone === 'success' && 'border-success/40 text-success hover:bg-success/10',
                    )}
                  >
                    <span>{g.label}</span>
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">{intervals?.[g.grade]}</span>
                    <span className="sr-only">Shortcut {g.key}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </article>
      ) : null}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Kbd>Space</Kbd> reveal · <Kbd>1</Kbd>–<Kbd>4</Kbd> grade
      </p>
    </div>
  )
}

function BackLink({ href, className }: { href: string; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-4', className)}>
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to={href}>
          <ArrowLeft aria-hidden /> Back
        </Link>
      </Button>
    </nav>
  )
}
