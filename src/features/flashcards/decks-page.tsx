import { useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { ArrowRight, Layers, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { isDue, State } from '@/lib/fsrs'
import { pluralize } from '@/lib/utils'
import { SUBJECTS } from '@/data/syllabus'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SubjectChip } from '@/components/ui/badge'
import { EmptyState, PageHeader, Progress } from '@/components/ui/misc'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const NONE = '__none__'

export default function DecksPage() {
  const [createOpen, setCreateOpen] = useState(false)

  const data = useLiveQuery(async () => {
    const [decks, cards] = await Promise.all([db.decks.orderBy('updatedAt').reverse().toArray(), db.cards.toArray()])
    const stats = new Map<string, { total: number; due: number; mature: number; newCount: number }>()
    for (const c of cards) {
      const s = stats.get(c.deckId) ?? { total: 0, due: 0, mature: 0, newCount: 0 }
      s.total++
      if (isDue(c)) s.due++
      if (c.state === State.Review && c.scheduled_days >= 21) s.mature++
      if (c.state === State.New) s.newCount++
      stats.set(c.deckId, s)
    }
    const totalDue = cards.filter((c) => isDue(c)).length
    return { decks, stats, totalDue, totalCards: cards.length }
  }, [])

  return (
    <div>
      <PageHeader
        title="Flashcards"
        description={
          data
            ? `${pluralize(data.totalCards, 'card')} across ${pluralize(data.decks.length, 'deck')} · ${data.totalDue} due now`
            : 'Spaced repetition powered by FSRS.'
        }
        actions={
          <>
            {data && data.totalDue > 0 ? (
              <Button asChild>
                <Link to="/flashcards/review">
                  <Sparkles aria-hidden /> Review all due ({data.totalDue})
                </Link>
              </Button>
            ) : null}
            <Button variant={data && data.totalDue > 0 ? 'outline' : 'default'} onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden /> New deck
            </Button>
          </>
        }
      />

      {data && data.decks.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No decks yet"
          description="Create a deck for a chapter or topic, then add cards manually or from any note."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden /> Create your first deck
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.decks.map((deck) => {
            const s = data.stats.get(deck.id) ?? { total: 0, due: 0, mature: 0, newCount: 0 }
            const maturePct = s.total ? Math.round((s.mature / s.total) * 100) : 0
            return (
              <li key={deck.id}>
                <Card className="group h-full transition-shadow hover:shadow-pop">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">
                          <Link to={`/flashcards/${deck.id}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 relative">
                            {deck.title}
                          </Link>
                        </h2>
                        {deck.description ? (
                          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{deck.description}</p>
                        ) : null}
                      </div>
                      <SubjectChip subjectId={deck.subjectId} size="xs" />
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        <strong className="text-foreground">{s.total}</strong> cards
                      </span>
                      <span>
                        <strong className="text-foreground">{s.newCount}</strong> new
                      </span>
                      <span>
                        <strong className={s.due ? 'text-primary' : 'text-foreground'}>{s.due}</strong> due
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                        <span>Mastery</span>
                        <span>{maturePct}%</span>
                      </div>
                      <Progress value={maturePct} tone="success" aria-label={`${deck.title} mastery ${maturePct}%`} />
                    </div>
                    <div className="mt-auto pt-4">
                      {s.due > 0 ? (
                        <Button asChild size="sm" className="relative z-10 w-full">
                          <Link to={`/flashcards/${deck.id}/review`}>
                            Review {s.due} <ArrowRight aria-hidden />
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="relative z-10 w-full">
                          <Link to={`/flashcards/${deck.id}`}>Open deck</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <CreateDeckDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

export function CreateDeckDialog({
  open,
  onOpenChange,
  initial,
  deckId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: { title: string; description: string; subjectId: string | null }
  deckId?: string
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [subjectId, setSubjectId] = useState<string>(initial?.subjectId ?? NONE)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!title.trim()) {
      setError('Give the deck a name.')
      return
    }
    const now = Date.now()
    if (deckId) {
      await db.decks.update(deckId, {
        title: title.trim(),
        description: description.trim(),
        subjectId: subjectId === NONE ? null : subjectId,
        updatedAt: now,
      })
      toast.success('Deck updated')
    } else {
      await db.decks.add({
        id: nanoid(),
        title: title.trim(),
        description: description.trim(),
        subjectId: subjectId === NONE ? null : subjectId,
        createdAt: now,
        updatedAt: now,
      })
      toast.success('Deck created')
      setTitle('')
      setDescription('')
      setSubjectId(NONE)
    }
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deckId ? 'Edit deck' : 'New deck'}</DialogTitle>
          <DialogDescription>One deck per chapter or topic works best.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Field label="Name" htmlFor="deck-title" error={error ?? undefined}>
            <Input id="deck-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Thermodynamics" aria-invalid={Boolean(error)} />
          </Field>
          <Field label="Description" htmlFor="deck-desc" hint="Optional">
            <Textarea id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-16" />
          </Field>
          <Field label="Subject" htmlFor="deck-subject">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="deck-subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No subject</SelectItem>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{deckId ? 'Save' : 'Create deck'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
