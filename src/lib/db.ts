import Dexie, { type EntityTable } from 'dexie'
import type { Card as FsrsCard } from 'ts-fsrs'

export type Id = string

export interface Note {
  id: Id
  title: string
  /** TipTap HTML */
  content: string
  plainText: string
  subjectId: string | null
  tags: string[]
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export interface Deck {
  id: Id
  title: string
  description: string
  subjectId: string | null
  createdAt: number
  updatedAt: number
}

export interface Flashcard extends FsrsCard {
  id: Id
  deckId: Id
  front: string
  back: string
  sourceNoteId: Id | null
  createdAt: number
  updatedAt: number
}

export interface ReviewEntry {
  id: Id
  cardId: Id
  deckId: Id
  rating: number
  state: number
  reviewedAt: number
  scheduledDays: number
  elapsedDays: number
}

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'done'

export interface Task {
  id: Id
  title: string
  notes: string
  /** ISO date (yyyy-mm-dd) in local time, or null for "someday" */
  dueDate: string | null
  priority: TaskPriority
  status: TaskStatus
  subjectId: string | null
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface FocusSession {
  id: Id
  startedAt: number
  endedAt: number
  durationSec: number
  kind: 'pomodoro' | 'free'
  subjectId: string | null
  taskId: Id | null
}

export interface Attempt {
  id: Id
  sessionId: Id
  questionId: string
  chosen: number | null
  correct: boolean
  timeMs: number
  createdAt: number
}

export interface PracticeSession {
  id: Id
  examId: string
  subjectId: string | null
  questionIds: string[]
  startedAt: number
  endedAt: number | null
  score: number | null
  total: number
}

class StudyWiseDB extends Dexie {
  notes!: EntityTable<Note, 'id'>
  decks!: EntityTable<Deck, 'id'>
  cards!: EntityTable<Flashcard, 'id'>
  reviews!: EntityTable<ReviewEntry, 'id'>
  tasks!: EntityTable<Task, 'id'>
  focusSessions!: EntityTable<FocusSession, 'id'>
  attempts!: EntityTable<Attempt, 'id'>
  practiceSessions!: EntityTable<PracticeSession, 'id'>

  constructor() {
    super('studywise')
    this.version(1).stores({
      notes: 'id, updatedAt, pinned, subjectId, *tags',
      decks: 'id, updatedAt, subjectId',
      cards: 'id, deckId, due, state, sourceNoteId',
      reviews: 'id, cardId, deckId, reviewedAt',
      tasks: 'id, status, dueDate, priority, updatedAt, subjectId',
      focusSessions: 'id, startedAt, subjectId',
      attempts: 'id, sessionId, questionId, createdAt',
      practiceSessions: 'id, examId, startedAt',
    })
  }
}

export const db = new StudyWiseDB()

export const TABLE_NAMES = [
  'notes',
  'decks',
  'cards',
  'reviews',
  'tasks',
  'focusSessions',
  'attempts',
  'practiceSessions',
] as const

export type TableName = (typeof TABLE_NAMES)[number]

export async function exportAll() {
  const data: Record<string, unknown[]> = {}
  for (const name of TABLE_NAMES) {
    data[name] = await db.table(name).toArray()
  }
  return {
    app: 'studywise',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export async function importAll(payload: unknown, mode: 'merge' | 'replace') {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new Error('This file is not a StudyWise backup.')
  }
  const data = (payload as { data: Record<string, unknown[]> }).data
  await db.transaction('rw', TABLE_NAMES.map((n) => db.table(n)), async () => {
    for (const name of TABLE_NAMES) {
      const rows = data[name]
      if (!Array.isArray(rows)) continue
      if (mode === 'replace') await db.table(name).clear()
      await db.table(name).bulkPut(rows)
    }
  })
}

export async function clearAll() {
  await db.transaction('rw', TABLE_NAMES.map((n) => db.table(n)), async () => {
    for (const name of TABLE_NAMES) await db.table(name).clear()
  })
}
