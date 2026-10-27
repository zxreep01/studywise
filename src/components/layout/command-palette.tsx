import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Command } from 'cmdk'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Layers, Moon, Plus, Search, Sun, SunMoon, Timer } from 'lucide-react'
import { db } from '@/lib/db'
import { updateSettings } from '@/lib/settings'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/misc'
import { NAV_ITEMS } from './nav'

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery('')
    onOpenChange(next)
  }

  const notes = useLiveQuery(
    async () => {
      if (!open) return []
      const q = query.trim().toLowerCase()
      const all = await db.notes.orderBy('updatedAt').reverse().limit(200).toArray()
      if (!q) return all.slice(0, 5)
      return all
        .filter((n) => n.title.toLowerCase().includes(q) || n.plainText.toLowerCase().includes(q))
        .slice(0, 8)
    },
    [open, query],
    [],
  )

  const decks = useLiveQuery(
    async () => {
      if (!open) return []
      const q = query.trim().toLowerCase()
      const all = await db.decks.toArray()
      return (q ? all.filter((d) => d.title.toLowerCase().includes(q)) : all).slice(0, 5)
    },
    [open, query],
    [],
  )

  const run = (fn: () => void) => {
    handleOpenChange(false)
    fn()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" hideClose>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search notes and decks, or jump to a page. Use arrow keys to move and Enter to select.
        </DialogDescription>
        <Command label="Command palette" shouldFilter={false} loop className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search notes, decks, or type a command…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Kbd>Esc</Kbd>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
            <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
              No results for “{query}”.
            </Command.Empty>

            <Command.Group heading="Actions">
              <Item onSelect={() => run(() => navigate('/notes?new=1'))} icon={Plus}>
                New note
              </Item>
              <Item onSelect={() => run(() => navigate('/planner?new=1'))} icon={Plus}>
                New task
              </Item>
              <Item onSelect={() => run(() => navigate('/flashcards/review'))} icon={Layers}>
                Review due flashcards
              </Item>
              <Item onSelect={() => run(() => navigate('/focus?start=1'))} icon={Timer}>
                Start focus session
              </Item>
            </Command.Group>

            {notes && notes.length > 0 ? (
              <Command.Group heading="Notes">
                {notes.map((n) => (
                  <Item key={n.id} value={`note-${n.id}`} onSelect={() => run(() => navigate(`/notes/${n.id}`))} icon={BookOpen}>
                    <span className="truncate">{n.title || 'Untitled'}</span>
                  </Item>
                ))}
              </Command.Group>
            ) : null}

            {decks && decks.length > 0 ? (
              <Command.Group heading="Decks">
                {decks.map((d) => (
                  <Item key={d.id} value={`deck-${d.id}`} onSelect={() => run(() => navigate(`/flashcards/${d.id}`))} icon={Layers}>
                    {d.title}
                  </Item>
                ))}
              </Command.Group>
            ) : null}

            <Command.Group heading="Go to">
              {NAV_ITEMS.map((item) => (
                <Item key={item.to} value={`nav-${item.to}`} onSelect={() => run(() => navigate(item.to))} icon={item.icon} shortcut={item.shortcut}>
                  {item.label}
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Theme">
              <Item onSelect={() => run(() => updateSettings({ theme: 'light' }))} icon={Sun}>
                Light theme
              </Item>
              <Item onSelect={() => run(() => updateSettings({ theme: 'dark' }))} icon={Moon}>
                Dark theme
              </Item>
              <Item onSelect={() => run(() => updateSettings({ theme: 'system' }))} icon={SunMoon}>
                System theme
              </Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function Item({
  children,
  onSelect,
  icon: Icon,
  value,
  shortcut,
}: {
  children: React.ReactNode
  onSelect: () => void
  icon: React.ComponentType<{ className?: string }>
  value?: string
  shortcut?: string
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex-1 truncate">{children}</span>
      {shortcut ? (
        <span className="flex gap-0.5" aria-hidden>
          {shortcut.split(' ').map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
        </span>
      ) : null}
    </Command.Item>
  )
}
