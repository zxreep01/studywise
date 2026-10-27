import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ArrowLeft, Layers, MoreHorizontal, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { db, type Flashcard } from '@/lib/db'
import { isDue, State, stateLabel } from '@/lib/fsrs'
import { pluralize } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input, Field, Textarea } from '@/components/ui/input'
import { Badge, SubjectChip } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreateCardDialog } from './create-card-dialog'
import { CreateDeckDialog } from './decks-page'

export default function DeckPage() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null)

  const deck = useLiveQuery(() => db.decks.get(deckId), [deckId])
  const cards = useLiveQuery(() => db.cards.where('deckId').equals(deckId).toArray(), [deckId])

  const filtered = useMemo(() => {
    if (!cards) return []
    const q = query.trim().toLowerCase()
    const list = q ? cards.filter((c) => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)) : cards
    return [...list].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
  }, [cards, query])

  const due = cards?.filter((c) => isDue(c)).length ?? 0

  const deleteDeck = async () => {
    await db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
      await db.cards.where('deckId').equals(deckId).delete()
      await db.reviews.where('deckId').equals(deckId).delete()
      await db.decks.delete(deckId)
    })
    toast.success('Deck deleted')
    navigate('/flashcards', { replace: true })
  }

  const deleteCard = async (card: Flashcard) => {
    await db.cards.delete(card.id)
    toast.success('Card deleted', {
      action: { label: 'Undo', onClick: () => db.cards.add(card) },
    })
  }

  if (deck === undefined) return <div className="h-64 animate-pulse rounded-xl bg-muted" aria-busy="true" />
  if (deck === null) {
    return (
      <EmptyState
        icon={Layers}
        title="Deck not found"
        action={
          <Button asChild variant="outline">
            <Link to="/flashcards">Back to decks</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/flashcards">
            <ArrowLeft aria-hidden /> All decks
          </Link>
        </Button>
      </nav>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{deck.title}</h1>
            <SubjectChip subjectId={deck.subjectId} />
          </div>
          {deck.description ? <p className="mt-1 text-sm text-muted-foreground">{deck.description}</p> : null}
          <p className="mt-1 text-sm text-muted-foreground">
            {pluralize(cards?.length ?? 0, 'card')} · {due} due
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddOpen(true)} variant={due ? 'outline' : 'default'}>
            <Plus aria-hidden /> Add card
          </Button>
          {due > 0 ? (
            <Button asChild>
              <Link to={`/flashcards/${deckId}/review`}>
                <Sparkles aria-hidden /> Review {due}
              </Link>
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Deck options">
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil aria-hidden /> Edit deck
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
                <Trash2 aria-hidden /> Delete deck
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {cards && cards.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="This deck is empty"
          description="Add your first card. Tip: select text in any note and press “Make flashcard”."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus aria-hidden /> Add card
            </Button>
          }
        />
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="card-search" className="sr-only">
              Search cards
            </label>
            <Input id="card-search" type="search" placeholder="Search cards…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Front</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Back</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">State</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Due</th>
                  <th scope="col" className="px-2 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-accent/40">
                    <td className="max-w-[16rem] px-4 py-3 align-top">
                      <p className="line-clamp-2 font-medium">{c.front}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground md:hidden">{c.back}</p>
                    </td>
                    <td className="hidden max-w-[16rem] px-4 py-3 align-top text-muted-foreground md:table-cell">
                      <p className="line-clamp-2">{c.back}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge variant={c.state === State.New ? 'secondary' : c.state === State.Review ? 'success' : 'warning'}>
                        {stateLabel(c.state)}
                      </Badge>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 align-top text-muted-foreground sm:table-cell">
                      {isDue(c) ? <span className="font-medium text-primary">Now</span> : format(new Date(c.due), 'd MMM, HH:mm')}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Options for card “${c.front.slice(0, 40)}”`}>
                            <MoreHorizontal aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditingCard(c)}>
                            <Pencil aria-hidden /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => deleteCard(c)}>
                            <Trash2 aria-hidden /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No cards match “{query}”.</p>
            ) : null}
          </div>
        </>
      )}

      <CreateCardDialog open={addOpen} onOpenChange={setAddOpen} deckId={deckId} />
      {editOpen ? (
        <CreateDeckDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          deckId={deckId}
          initial={{ title: deck.title, description: deck.description, subjectId: deck.subjectId }}
        />
      ) : null}
      {editingCard ? <EditCardDialog card={editingCard} onClose={() => setEditingCard(null)} /> : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deck.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the deck, its {pluralize(cards?.length ?? 0, 'card')} and all review history. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction destructive onClick={deleteDeck}>
              Delete deck
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EditCardDialog({ card, onClose }: { card: Flashcard; onClose: () => void }) {
  const [front, setFront] = useState(card.front)
  const [back, setBack] = useState(card.back)
  const save = async () => {
    if (!front.trim() || !back.trim()) return
    await db.cards.update(card.id, { front: front.trim(), back: back.trim(), updatedAt: Date.now() })
    toast.success('Card updated')
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Field label="Front" htmlFor="edit-front">
            <Textarea id="edit-front" value={front} onChange={(e) => setFront(e.target.value)} />
          </Field>
          <Field label="Back" htmlFor="edit-back">
            <Textarea id="edit-back" value={back} onChange={(e) => setBack(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!front.trim() || !back.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
