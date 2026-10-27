import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { BookOpen, Pin, Plus, Search } from 'lucide-react'
import { db, type Note } from '@/lib/db'
import { relativeTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubjectChip } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { NoteEditor } from './note-editor'

async function createNote(): Promise<Note> {
  const now = Date.now()
  const note: Note = {
    id: nanoid(),
    title: '',
    content: '',
    plainText: '',
    subjectId: null,
    tags: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.notes.add(note)
  return note
}

export default function NotesPage() {
  const { noteId } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')

  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), [], undefined)

  useEffect(() => {
    if (params.get('new') === '1') {
      setParams({}, { replace: true })
      createNote().then((n) => navigate(`/notes/${n.id}`, { replace: true }))
    }
  }, [params, setParams, navigate])

  const filtered = useMemo(() => {
    if (!notes) return []
    const q = query.trim().toLowerCase()
    const list = q
      ? notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.plainText.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)),
        )
      : notes
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
  }, [notes, query])

  const handleNew = async () => {
    const n = await createNote()
    navigate(`/notes/${n.id}`)
  }

  const showList = !noteId
  const showEditor = Boolean(noteId)

  return (
    <div className="-mx-4 -mt-6 flex h-[calc(100dvh-3.5rem-4rem)] md:-mx-8 md:h-[calc(100dvh-4rem)] md:-mt-6">
      {/* List pane */}
      <section
        aria-label="Notes list"
        className={cn(
          'flex w-full shrink-0 flex-col border-r bg-background md:w-80 lg:w-96',
          showList ? 'flex' : 'hidden md:flex',
        )}
      >
        <div className="flex items-center gap-2 border-b p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="notes-search" className="sr-only">
              Search notes
            </label>
            <Input
              id="notes-search"
              type="search"
              placeholder="Search notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleNew} size="icon" aria-label="New note">
            <Plus aria-hidden />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin" role="region" aria-live="polite">
          {notes && filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={BookOpen}
                title={query ? 'No matching notes' : 'No notes yet'}
                description={query ? 'Try a different search term.' : 'Capture class notes, formulas and summaries. Everything stays on your device.'}
                action={!query ? <Button onClick={handleNew}><Plus aria-hidden /> New note</Button> : undefined}
              />
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((n) => {
                const active = n.id === noteId
                return (
                  <li key={n.id}>
                    <Link
                      to={`/notes/${n.id}`}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'block px-4 py-3 transition-colors hover:bg-accent/60',
                        active && 'bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <p className={cn('min-w-0 flex-1 truncate text-sm font-medium', !n.title && 'text-muted-foreground')}>
                          {n.title || 'Untitled'}
                        </p>
                        {n.pinned ? <Pin className="mt-0.5 size-3.5 shrink-0 text-primary" aria-label="Pinned" /> : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.plainText.slice(0, 140) || 'Empty note'}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <SubjectChip subjectId={n.subjectId} size="xs" />
                        <span className="ml-auto text-[11px] text-muted-foreground">{relativeTime(n.updatedAt)}</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Editor pane */}
      <section
        aria-label="Note editor"
        className={cn('min-w-0 flex-1 flex-col overflow-hidden', showEditor ? 'flex' : 'hidden md:flex')}
      >
        {noteId ? (
          <NoteEditor key={noteId} noteId={noteId} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState
              icon={BookOpen}
              title="Select a note"
              description="Choose a note from the list or create a new one."
              action={<Button onClick={handleNew}><Plus aria-hidden /> New note</Button>}
              className="border-0"
            />
          </div>
        )}
      </section>
    </div>
  )
}
