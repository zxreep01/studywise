import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import {
  ArrowLeft,
  Bold,
  Check,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  Layers,
  List,
  ListOrdered,
  MoreHorizontal,
  Pin,
  PinOff,
  Quote,
  Redo2,
  Strikethrough,
  Trash2,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { cn, stripHtml } from '@/lib/utils'
import { SUBJECTS } from '@/data/syllabus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip } from '@/components/ui/misc'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { CreateCardDialog } from '@/features/flashcards/create-card-dialog'

const NONE = '__none__'

export function NoteEditor({ noteId }: { noteId: string }) {
  const navigate = useNavigate()
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId])
  const [title, setTitle] = useState<string | null>(null)
  const [saved, setSaved] = useState<'saved' | 'saving'>('saved')
  const [cardDialog, setCardDialog] = useState<{ open: boolean; front: string }>({ open: false, front: '' })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const saveTimer = useRef<number | undefined>(undefined)
  const loadedRef = useRef(false)

  const persistContent = useCallback(
    (html: string) => {
      setSaved('saving')
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(async () => {
        await db.notes.update(noteId, { content: html, plainText: stripHtml(html), updatedAt: Date.now() })
        setSaved('saved')
      }, 400)
    },
    [noteId],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({
        placeholder: 'Start writing… Select text and press “Make flashcard” to turn it into a card.',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        'aria-label': 'Note content',
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => {
      if (loadedRef.current) persistContent(editor.getHTML())
    },
  })

  // Load initial content once the note arrives.
  useEffect(() => {
    if (!editor || !note || loadedRef.current) return
    editor.commands.setContent(note.content || '', { emitUpdate: false })
    loadedRef.current = true
  }, [editor, note])

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  const onTitleChange = (value: string) => {
    setTitle(value)
    setSaved('saving')
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      await db.notes.update(noteId, { title: value, updatedAt: Date.now() })
      setSaved('saved')
    }, 300)
  }

  const makeFlashcard = () => {
    if (!editor) return
    const { from, to, empty } = editor.state.selection
    const text = empty ? '' : editor.state.doc.textBetween(from, to, ' ')
    setCardDialog({ open: true, front: text.trim() })
  }

  const togglePin = async () => {
    if (!note) return
    await db.notes.update(noteId, { pinned: !note.pinned })
  }

  const deleteNote = async () => {
    await db.notes.delete(noteId)
    toast.success('Note deleted')
    navigate('/notes', { replace: true })
  }

  if (note === undefined) {
    return <div className="flex-1 animate-pulse bg-muted/40" aria-busy="true" />
  }
  if (note === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">This note no longer exists.</p>
        <Button variant="outline" onClick={() => navigate('/notes')}>
          Back to notes
        </Button>
      </div>
    )
  }

  const hasSelection = editor ? !editor.state.selection.empty : false

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b px-2 py-2 md:px-4">
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Back to notes" onClick={() => navigate('/notes')}>
          <ArrowLeft aria-hidden />
        </Button>
        <Toolbar editor={editor} />
        <div className="flex-1" />
        <span className="hidden px-2 text-xs text-muted-foreground sm:inline" role="status" aria-live="polite">
          {saved === 'saving' ? 'Saving…' : 'Saved'}
        </span>
        <Button size="sm" variant={hasSelection ? 'default' : 'outline'} onClick={makeFlashcard}>
          <Layers aria-hidden />
          <span className="hidden sm:inline">Make flashcard</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More options">
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={togglePin}>
              {note.pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
              {note.pinned ? 'Unpin' : 'Pin to top'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
              <Trash2 aria-hidden /> Delete note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-3xl px-5 py-6 md:px-10 md:py-10">
          <label htmlFor="note-title" className="sr-only">
            Note title
          </label>
          <input
            id="note-title"
            value={title ?? note.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled"
            className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/50 md:text-4xl"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                editor?.commands.focus('start')
              }
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select
              value={note.subjectId ?? NONE}
              onValueChange={(v) => db.notes.update(noteId, { subjectId: v === NONE ? null : v })}
            >
              <SelectTrigger className="h-8 w-auto min-w-36 rounded-full text-xs" aria-label="Subject">
                <SelectValue placeholder="Subject" />
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
            <TagsInput tags={note.tags} onChange={(tags) => db.notes.update(noteId, { tags })} />
          </div>

          <div className="prose-editor mt-6 text-[15px] leading-7">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <CreateCardDialog
        open={cardDialog.open}
        onOpenChange={(open) => setCardDialog((s) => ({ ...s, open }))}
        initialFront={cardDialog.front}
        sourceNoteId={noteId}
        defaultSubjectId={note.subjectId}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              “{note.title || 'Untitled'}” will be permanently removed from this device. Flashcards made
              from it are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction destructive onClick={deleteNote}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor | null }) {
  // Re-render on selection/transaction so pressed states stay in sync.
  const [, force] = useState(0)
  useEffect(() => {
    if (!editor) return
    const update = () => force((n) => n + 1)
    editor.on('transaction', update)
    editor.on('selectionUpdate', update)
    return () => {
      editor.off('transaction', update)
      editor.off('selectionUpdate', update)
    }
  }, [editor])

  if (!editor) return null

  const items: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    active?: boolean
    disabled?: boolean
    onClick: () => void
    hideOnMobile?: boolean
  }[] = [
    { label: 'Undo', icon: Undo2, onClick: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo(), hideOnMobile: true },
    { label: 'Redo', icon: Redo2, onClick: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo(), hideOnMobile: true },
    { label: 'Bold', icon: Bold, active: editor.isActive('bold'), onClick: () => editor.chain().focus().toggleBold().run() },
    { label: 'Italic', icon: Italic, active: editor.isActive('italic'), onClick: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Strikethrough', icon: Strikethrough, active: editor.isActive('strike'), onClick: () => editor.chain().focus().toggleStrike().run(), hideOnMobile: true },
    { label: 'Highlight', icon: Highlighter, active: editor.isActive('highlight'), onClick: () => editor.chain().focus().toggleHighlight().run() },
    { label: 'Heading 1', icon: Heading1, active: editor.isActive('heading', { level: 1 }), onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), hideOnMobile: true },
    { label: 'Heading 2', icon: Heading2, active: editor.isActive('heading', { level: 2 }), onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Bullet list', icon: List, active: editor.isActive('bulletList'), onClick: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered list', icon: ListOrdered, active: editor.isActive('orderedList'), onClick: () => editor.chain().focus().toggleOrderedList().run(), hideOnMobile: true },
    { label: 'Checklist', icon: CheckSquare, active: editor.isActive('taskList'), onClick: () => editor.chain().focus().toggleTaskList().run() },
    { label: 'Quote', icon: Quote, active: editor.isActive('blockquote'), onClick: () => editor.chain().focus().toggleBlockquote().run(), hideOnMobile: true },
    { label: 'Code block', icon: Code, active: editor.isActive('codeBlock'), onClick: () => editor.chain().focus().toggleCodeBlock().run(), hideOnMobile: true },
  ]

  return (
    <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 overflow-x-auto">
      {items.map((item) => (
        <Tooltip key={item.label} content={item.label}>
          <button
            type="button"
            aria-label={item.label}
            aria-pressed={item.active}
            disabled={item.disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={item.onClick}
            className={cn(
              'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40',
              item.active && 'bg-primary/10 text-primary',
              item.hideOnMobile && 'hidden sm:inline-flex',
            )}
          >
            <item.icon className="size-4" aria-hidden />
          </button>
        </Tooltip>
      ))}
    </div>
  )
}

function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = () => {
    const next = draft
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean)
    if (next.length) onChange(Array.from(new Set([...tags, ...next])))
    setDraft('')
    setEditing(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          #{t}
          <button
            type="button"
            className="-mr-1 rounded-full p-0.5 hover:bg-foreground/10 hover:text-foreground"
            aria-label={`Remove tag ${t}`}
            onClick={() => onChange(tags.filter((x) => x !== t))}
          >
            <span aria-hidden>×</span>
          </button>
        </span>
      ))}
      {editing ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            commit()
          }}
        >
          <label htmlFor="tag-input" className="sr-only">
            Add tags, separated by commas
          </label>
          <Input
            id="tag-input"
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDraft('')
                setEditing(false)
              }
            }}
            placeholder="tag, another-tag"
            className="h-7 w-40 rounded-full text-xs"
          />
          <Button type="submit" size="icon-sm" variant="ghost" aria-label="Add tags">
            <Check aria-hidden />
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          + tag
        </button>
      )}
    </div>
  )
}
