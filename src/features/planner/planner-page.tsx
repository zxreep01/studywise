import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'
import { CalendarCheck, Flag, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { db, type Task, type TaskPriority } from '@/lib/db'
import { describeDueDate, fromDateKey, offsetDateKey, todayKey } from '@/lib/dates'
import { cn, pluralize } from '@/lib/utils'
import { SUBJECTS } from '@/data/syllabus'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Badge, SubjectChip } from '@/components/ui/badge'
import { Checkbox, EmptyState, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NONE = '__none__'
const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

export default function PlannerPage() {
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Task | null | 'new'>(null)
  const [tab, setTab] = useState('today')
  const today = todayKey()

  // `?new=1` (from the command palette / PWA shortcut) opens the dialog without extra state.
  const wantsNew = params.get('new') === '1'
  const activeDialog = editing ?? (wantsNew ? 'new' : null)
  const closeDialog = () => {
    setEditing(null)
    if (wantsNew) setParams({}, { replace: true })
  }

  const tasks = useLiveQuery(() => db.tasks.toArray(), [])

  const groups = useMemo(() => {
    if (!tasks) return null
    const sortTasks = (list: Task[]) =>
      [...list].sort(
        (a, b) =>
          (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          a.createdAt - b.createdAt,
      )
    const open = tasks.filter((t) => t.status === 'todo')
    const done = tasks
      .filter((t) => t.status === 'done')
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    return {
      today: sortTasks(open.filter((t) => t.dueDate !== null && t.dueDate <= today)),
      upcoming: sortTasks(open.filter((t) => t.dueDate !== null && t.dueDate > today)),
      someday: sortTasks(open.filter((t) => t.dueDate === null)),
      all: sortTasks(open),
      done,
    }
  }, [tasks, today])

  const toggle = async (task: Task) => {
    const done = task.status === 'todo'
    await db.tasks.update(task.id, {
      status: done ? 'done' : 'todo',
      completedAt: done ? Date.now() : null,
      updatedAt: Date.now(),
    })
    if (done) {
      toast.success('Task completed', {
        action: { label: 'Undo', onClick: () => db.tasks.update(task.id, { status: 'todo', completedAt: null }) },
      })
    }
  }

  const remove = async (task: Task) => {
    await db.tasks.delete(task.id)
    toast.success('Task deleted', { action: { label: 'Undo', onClick: () => db.tasks.add(task) } })
  }

  const clearDone = async () => {
    const ids = groups?.done.map((t) => t.id) ?? []
    if (!ids.length) return
    await db.tasks.bulkDelete(ids)
    toast.success(`Cleared ${pluralize(ids.length, 'completed task')}`)
  }

  const counts = {
    today: groups?.today.length ?? 0,
    upcoming: groups?.upcoming.length ?? 0,
    all: groups?.all.length ?? 0,
    done: groups?.done.length ?? 0,
  }

  return (
    <div>
      <PageHeader
        title="Planner"
        description="Plan the day, keep the week in view."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden /> New task
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Task views" className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="today">
            Today {counts.today ? <Count n={counts.today} /> : null}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming {counts.upcoming ? <Count n={counts.upcoming} /> : null}
          </TabsTrigger>
          <TabsTrigger value="all">All {counts.all ? <Count n={counts.all} /> : null}</TabsTrigger>
          <TabsTrigger value="done">Done {counts.done ? <Count n={counts.done} /> : null}</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <TaskList
            tasks={groups?.today ?? []}
            loading={!groups}
            onToggle={toggle}
            onEdit={setEditing}
            onDelete={remove}
            empty={{
              title: 'Nothing planned for today',
              description: 'Add a task with today’s date, or pull one forward from Upcoming.',
            }}
          />
        </TabsContent>

        <TabsContent value="upcoming">
          <GroupedByDate tasks={groups?.upcoming ?? []} loading={!groups} onToggle={toggle} onEdit={setEditing} onDelete={remove} />
          {groups && groups.someday.length ? (
            <section className="mt-6" aria-labelledby="someday-heading">
              <h2 id="someday-heading" className="mb-2 text-sm font-semibold text-muted-foreground">
                Someday
              </h2>
              <TaskList tasks={groups.someday} onToggle={toggle} onEdit={setEditing} onDelete={remove} />
            </section>
          ) : null}
        </TabsContent>

        <TabsContent value="all">
          <TaskList
            tasks={groups?.all ?? []}
            loading={!groups}
            onToggle={toggle}
            onEdit={setEditing}
            onDelete={remove}
            empty={{ title: 'No open tasks', description: 'You’re all clear. Add a task to get started.' }}
          />
        </TabsContent>

        <TabsContent value="done">
          {groups && groups.done.length ? (
            <div className="mb-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearDone}>
                <Trash2 aria-hidden /> Clear completed
              </Button>
            </div>
          ) : null}
          <TaskList
            tasks={groups?.done ?? []}
            loading={!groups}
            onToggle={toggle}
            onEdit={setEditing}
            onDelete={remove}
            empty={{ title: 'Nothing completed yet', description: 'Finished tasks show up here.' }}
          />
        </TabsContent>
      </Tabs>

      {activeDialog ? (
        <TaskDialog task={activeDialog === 'new' ? null : activeDialog} onClose={closeDialog} defaultDate={tab === 'today' ? today : null} />
      ) : null}
    </div>
  )
}

function Count({ n }: { n: number }) {
  return <span className="ml-1 rounded-full bg-foreground/10 px-1.5 text-[11px] tabular-nums">{n}</span>
}

function GroupedByDate(props: {
  tasks: Task[]
  loading?: boolean
  onToggle: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of props.tasks) {
      const k = t.dueDate ?? ''
      map.set(k, [...(map.get(k) ?? []), t])
    }
    return Array.from(map.entries())
  }, [props.tasks])

  if (props.loading) return <TaskList tasks={[]} loading />
  if (!groups.length) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="Nothing scheduled ahead"
        description="Give tasks a future date and they’ll appear here grouped by day."
      />
    )
  }
  return (
    <div className="space-y-6">
      {groups.map(([date, list]) => (
        <section key={date} aria-labelledby={`date-${date}`}>
          <h2 id={`date-${date}`} className="mb-2 text-sm font-semibold">
            {describeDueDate(date).label}
            <span className="ml-2 font-normal text-muted-foreground">{format(fromDateKey(date), 'd MMM')}</span>
          </h2>
          <TaskList tasks={list} onToggle={props.onToggle} onEdit={props.onEdit} onDelete={props.onDelete} />
        </section>
      ))}
    </div>
  )
}

function TaskList({
  tasks,
  loading,
  onToggle,
  onEdit,
  onDelete,
  empty,
}: {
  tasks: Task[]
  loading?: boolean
  onToggle?: (t: Task) => void
  onEdit?: (t: Task) => void
  onDelete?: (t: Task) => void
  empty?: { title: string; description?: string }
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }
  if (!tasks.length) {
    return empty ? <EmptyState icon={CalendarCheck} title={empty.title} description={empty.description} /> : null
  }
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {tasks.map((t) => {
        const due = describeDueDate(t.dueDate)
        const done = t.status === 'done'
        return (
          <li key={t.id} className={cn('flex items-start gap-3 px-3 py-3 transition-colors hover:bg-accent/40', done && 'opacity-70')}>
            <Checkbox
              id={`task-${t.id}`}
              checked={done}
              onCheckedChange={() => onToggle?.(t)}
              aria-label={done ? `Mark “${t.title}” as not done` : `Mark “${t.title}” done`}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <label htmlFor={`task-${t.id}`} className={cn('block cursor-pointer text-sm font-medium', done && 'line-through')}>
                {t.title}
              </label>
              {t.notes ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.notes}</p> : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {!done ? (
                  <Badge variant={due.tone === 'overdue' ? 'destructive' : due.tone === 'primary' ? 'default' : 'muted'}>
                    {due.label}
                  </Badge>
                ) : (
                  <Badge variant="muted">Done {t.completedAt ? format(t.completedAt, 'd MMM') : ''}</Badge>
                )}
                {t.priority !== 'medium' ? (
                  <Badge variant={t.priority === 'high' ? 'warning' : 'muted'}>
                    <Flag className="size-3" aria-hidden /> {t.priority}
                  </Badge>
                ) : null}
                <SubjectChip subjectId={t.subjectId} size="xs" />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Options for “${t.title}”`}>
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit?.(t)}>
                  <Pencil aria-hidden /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem destructive onSelect={() => onDelete?.(t)}>
                  <Trash2 aria-hidden /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        )
      })}
    </ul>
  )
}

function TaskDialog({ task, onClose, defaultDate }: { task: Task | null; onClose: () => void; defaultDate: string | null }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [dueDate, setDueDate] = useState(task ? (task.dueDate ?? '') : (defaultDate ?? todayKey()))
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [subjectId, setSubjectId] = useState(task?.subjectId ?? NONE)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!title.trim()) {
      setError('Give the task a name.')
      return
    }
    const now = Date.now()
    const payload = {
      title: title.trim(),
      notes: notes.trim(),
      dueDate: dueDate || null,
      priority,
      subjectId: subjectId === NONE ? null : subjectId,
      updatedAt: now,
    }
    if (task) {
      await db.tasks.update(task.id, payload)
      toast.success('Task updated')
    } else {
      await db.tasks.add({ id: nanoid(), status: 'todo', completedAt: null, createdAt: now, ...payload })
      toast.success('Task added')
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>Small, specific tasks get done. “Revise chapter 4 formulas” beats “Study physics”.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Field label="Task" htmlFor="task-title" error={error ?? undefined}>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" aria-invalid={Boolean(error)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due date" htmlFor="task-date" hint="Leave empty for “someday”">
              <Input id="task-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="Priority" htmlFor="task-priority">
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick dates">
            {[
              ['Today', todayKey()],
              ['Tomorrow', offsetDateKey(1)],
              ['Next week', offsetDateKey(7)],
              ['No date', ''],
            ].map(([label, value]) => (
              <Button key={label} type="button" size="sm" variant={dueDate === value ? 'secondary' : 'ghost'} onClick={() => setDueDate(value)} aria-pressed={dueDate === value}>
                {label}
              </Button>
            ))}
          </div>
          <Field label="Subject" htmlFor="task-subject">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="task-subject">
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
          <Field label="Notes" htmlFor="task-notes" hint="Optional">
            <Textarea id="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{task ? 'Save changes' : 'Add task'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
