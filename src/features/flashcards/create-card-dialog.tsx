import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { newFlashcard } from '@/lib/fsrs'
import { Button } from '@/components/ui/button'
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

const NEW_DECK = '__new__'

interface CreateCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFront?: string
  initialBack?: string
  /** Lock the deck when creating from inside a deck. */
  deckId?: string
  sourceNoteId?: string | null
  defaultSubjectId?: string | null
}

export function CreateCardDialog({ open, onOpenChange, ...formProps }: CreateCardDialogProps) {
  const backRef = useRef<HTMLTextAreaElement>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          // When text was pre-filled from a note, jump straight to the answer field.
          if (formProps.initialFront) {
            e.preventDefault()
            backRef.current?.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>New flashcard</DialogTitle>
          <DialogDescription>
            Keep the front short and specific. The scheduler will show it again right before you’d forget.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted fresh each time the dialog opens, so state resets without effects. */}
        <CreateCardForm {...formProps} backRef={backRef} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CreateCardForm({
  initialFront = '',
  initialBack = '',
  deckId,
  sourceNoteId = null,
  defaultSubjectId = null,
  backRef,
  onDone,
}: Omit<CreateCardDialogProps, 'open' | 'onOpenChange'> & {
  backRef: React.RefObject<HTMLTextAreaElement | null>
  onDone: () => void
}) {
  const decks = useLiveQuery(() => db.decks.orderBy('updatedAt').reverse().toArray(), [], [])
  const [front, setFront] = useState(initialFront)
  const [back, setBack] = useState(initialBack)
  const [selectedDeck, setSelectedDeck] = useState<string>('')
  const [newDeckTitle, setNewDeckTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)

  const effectiveDeck = deckId ?? (selectedDeck || decks?.[0]?.id || NEW_DECK)

  const submit = async (keepOpen: boolean) => {
    if (!front.trim()) {
      setError('The front of the card can’t be empty.')
      return
    }
    if (!back.trim()) {
      setError('Add an answer on the back of the card.')
      return
    }
    let targetDeck = effectiveDeck
    if (targetDeck === NEW_DECK) {
      const title = newDeckTitle.trim() || 'My deck'
      const now = Date.now()
      targetDeck = nanoid()
      await db.decks.add({
        id: targetDeck,
        title,
        description: '',
        subjectId: defaultSubjectId,
        createdAt: now,
        updatedAt: now,
      })
      setNewDeckTitle('')
      setSelectedDeck(targetDeck)
    }
    await db.cards.add(newFlashcard({ deckId: targetDeck, front, back, sourceNoteId }))
    await db.decks.update(targetDeck, { updatedAt: Date.now() })
    toast.success('Flashcard added')
    setError(null)
    if (keepOpen) {
      setFront('')
      setBack('')
      setSavedCount((n) => n + 1)
      document.getElementById('card-front')?.focus()
    } else {
      onDone()
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit(false)
      }}
    >
      {savedCount > 0 ? (
        <p className="text-xs text-muted-foreground" role="status">
          {savedCount} saved in this session.
        </p>
      ) : null}
      <Field label="Front (question)" htmlFor="card-front" error={error && !front.trim() ? error : undefined}>
        <Textarea
          id="card-front"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="e.g. Second equation of motion?"
          aria-invalid={Boolean(error && !front.trim())}
          className="min-h-16"
        />
      </Field>
      <Field label="Back (answer)" htmlFor="card-back" error={error && front.trim() && !back.trim() ? error : undefined}>
        <Textarea
          ref={backRef}
          id="card-back"
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="e.g. s = ut + ½at²"
          aria-invalid={Boolean(error && front.trim() && !back.trim())}
          className="min-h-16"
        />
      </Field>
      {!deckId ? (
        <Field label="Deck" htmlFor="card-deck">
          <Select value={effectiveDeck} onValueChange={setSelectedDeck}>
            <SelectTrigger id="card-deck">
              <SelectValue placeholder="Choose a deck" />
            </SelectTrigger>
            <SelectContent>
              {decks?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.title}
                </SelectItem>
              ))}
              <SelectItem value={NEW_DECK}>+ New deck…</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {effectiveDeck === NEW_DECK ? (
        <Field label="New deck name" htmlFor="card-new-deck">
          <Input
            id="card-new-deck"
            value={newDeckTitle}
            onChange={(e) => setNewDeckTitle(e.target.value)}
            placeholder="e.g. Organic Chemistry reactions"
          />
        </Field>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => submit(true)}>
          Save & add another
        </Button>
        <Button type="submit">Save card</Button>
      </DialogFooter>
    </form>
  )
}
