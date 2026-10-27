import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
} from 'ts-fsrs'
import { nanoid } from 'nanoid'
import { db, type Flashcard, type ReviewEntry } from './db'

const scheduler = fsrs(
  generatorParameters({
    enable_fuzz: true,
    enable_short_term: true,
    maximum_interval: 365,
  }),
)

export { Rating, State }
export type { Grade }

export const GRADES: { grade: Grade; label: string; key: string; tone: string }[] = [
  { grade: Rating.Again, label: 'Again', key: '1', tone: 'destructive' },
  { grade: Rating.Hard, label: 'Hard', key: '2', tone: 'warning' },
  { grade: Rating.Good, label: 'Good', key: '3', tone: 'primary' },
  { grade: Rating.Easy, label: 'Easy', key: '4', tone: 'success' },
]

export function newFlashcard(
  input: Pick<Flashcard, 'deckId' | 'front' | 'back'> & Partial<Pick<Flashcard, 'sourceNoteId'>>,
): Flashcard {
  const now = Date.now()
  return {
    ...createEmptyCard(new Date(now)),
    id: nanoid(),
    deckId: input.deckId,
    front: input.front.trim(),
    back: input.back.trim(),
    sourceNoteId: input.sourceNoteId ?? null,
    createdAt: now,
    updatedAt: now,
  }
}

function toFsrsCard(card: Flashcard): FsrsCard {
  const {
    due,
    stability,
    difficulty,
    elapsed_days,
    scheduled_days,
    learning_steps,
    reps,
    lapses,
    state,
    last_review,
  } = card
  return {
    due: new Date(due),
    stability,
    difficulty,
    elapsed_days,
    scheduled_days,
    learning_steps,
    reps,
    lapses,
    state,
    last_review: last_review ? new Date(last_review) : undefined,
  }
}

/** Human-readable interval for each grade, for the review buttons. */
export function previewIntervals(card: Flashcard, now = new Date()) {
  const log = scheduler.repeat(toFsrsCard(card), now)
  const out: Record<Grade, string> = {} as Record<Grade, string>
  for (const { grade } of GRADES) {
    out[grade] = formatInterval(log[grade].card.due.getTime() - now.getTime())
  }
  return out
}

export async function reviewCard(card: Flashcard, grade: Grade, now = new Date()) {
  const { card: next, log } = scheduler.next(toFsrsCard(card), now, grade)
  const updated: Flashcard = { ...card, ...next, updatedAt: now.getTime() }
  const entry: ReviewEntry = {
    id: nanoid(),
    cardId: card.id,
    deckId: card.deckId,
    rating: log.rating,
    state: log.state,
    reviewedAt: now.getTime(),
    scheduledDays: log.scheduled_days,
    elapsedDays: log.elapsed_days,
  }
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put(updated)
    await db.reviews.add(entry)
  })
  return updated
}

export function formatInterval(ms: number) {
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo`
  return `${(days / 365).toFixed(1)}y`
}

export function isDue(card: Flashcard, now = Date.now()) {
  return new Date(card.due).getTime() <= now
}

export function stateLabel(state: State) {
  switch (state) {
    case State.New:
      return 'New'
    case State.Learning:
      return 'Learning'
    case State.Review:
      return 'Review'
    case State.Relearning:
      return 'Relearning'
    default:
      return 'Unknown'
  }
}
