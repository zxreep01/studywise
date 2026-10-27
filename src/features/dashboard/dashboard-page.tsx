import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ArrowRight, BookOpen, CalendarCheck, Flame, Layers, Plus, Target, Timer } from 'lucide-react'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { isDue } from '@/lib/fsrs'
import { greeting, relativeTime, todayKey, toDateKey } from '@/lib/dates'
import { useSettings, updateSettings } from '@/lib/settings'
import { EXAMS, examById } from '@/data/syllabus'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, SubjectChip } from '@/components/ui/badge'
import { Checkbox, Progress, Stat } from '@/components/ui/misc'
import { Field, Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function setTaskStatus(id: string, status: 'todo' | 'done') {
  const now = Date.now()
  return db.tasks.update(id, { status, completedAt: status === 'done' ? now : null, updatedAt: now })
}

function computeStreak(dayKeys: Set<string>) {
  let streak = 0
  const cursor = new Date()
  // Today counts if active; otherwise start from yesterday.
  if (!dayKeys.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (dayKeys.has(toDateKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default function DashboardPage() {
  const settings = useSettings()
  const navigate = useNavigate()
  const today = todayKey()
  const [quickTask, setQuickTask] = useState('')

  const data = useLiveQuery(async () => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const since7 = Date.now() - 7 * 86400000
    const [cards, tasks, focus, attempts, notes, reviews, decks] = await Promise.all([
      db.cards.toArray(),
      db.tasks.where('status').equals('todo').toArray(),
      db.focusSessions.where('startedAt').aboveOrEqual(since7 - 23 * 86400000).toArray(),
      db.attempts.where('createdAt').aboveOrEqual(since7).toArray(),
      db.notes.orderBy('updatedAt').reverse().limit(4).toArray(),
      db.reviews.where('reviewedAt').aboveOrEqual(since7 - 23 * 86400000).toArray(),
      db.decks.toArray(),
    ])
    const dueCards = cards.filter((c) => isDue(c))
    const dueByDeck = new Map<string, number>()
    for (const c of dueCards) dueByDeck.set(c.deckId, (dueByDeck.get(c.deckId) ?? 0) + 1)

    const focusTodaySec = focus
      .filter((f) => f.startedAt >= startOfToday.getTime())
      .reduce((s, f) => s + f.durationSec, 0)

    const activeDays = new Set<string>()
    focus.forEach((f) => activeDays.add(toDateKey(f.startedAt)))
    reviews.forEach((r) => activeDays.add(toDateKey(r.reviewedAt)))
    attempts.forEach((a) => activeDays.add(toDateKey(a.createdAt)))

    const accuracy = attempts.length
      ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100)
      : null

    return {
      dueCount: dueCards.length,
      dueByDeck,
      decks,
      todayTasks: tasks
        .filter((t) => t.dueDate !== null && t.dueDate <= today)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
      focusTodayMin: Math.round(focusTodaySec / 60),
      streak: computeStreak(activeDays),
      accuracy,
      attemptsCount: attempts.length,
      notes,
    }
  }, [today])

  const exam = examById[settings.examId]

  const addQuickTask = async () => {
    const title = quickTask.trim()
    if (!title) return
    const now = Date.now()
    await db.tasks.add({
      id: nanoid(),
      title,
      notes: '',
      dueDate: today,
      priority: 'medium',
      status: 'todo',
      subjectId: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    setQuickTask('')
    toast.success('Task added for today')
  }

  const completeTask = async (id: string) => {
    await setTaskStatus(id, 'done')
    toast.success('Nice, task done', {
      action: { label: 'Undo', onClick: () => setTaskStatus(id, 'todo') },
    })
  }

  const goalPct = useMemo(
    () => Math.min(100, Math.round(((data?.focusTodayMin ?? 0) / Math.max(1, settings.dailyGoalMinutes)) * 100)),
    [data?.focusTodayMin, settings.dailyGoalMinutes],
  )

  return (
    <div className="space-y-8">
      <OnboardingDialog />

      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, d MMMM')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting()}
            {settings.displayName ? `, ${settings.displayName}` : ''}
          </h1>
        </div>
        {exam ? (
          <Badge variant="secondary" className="w-fit text-sm">
            Preparing for {exam.name}
          </Badge>
        ) : null}
      </header>

      <section aria-labelledby="today-stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <h2 id="today-stats" className="sr-only">
          Today at a glance
        </h2>
        <Stat
          label="Cards due"
          value={data?.dueCount ?? '–'}
          hint={data?.dueCount ? 'Ready to review' : 'All caught up'}
          icon={Layers}
          tone={data?.dueCount ? 'primary' : 'success'}
        />
        <Stat
          label="Tasks today"
          value={data?.todayTasks.length ?? '–'}
          hint={data?.todayTasks.some((t) => t.dueDate && t.dueDate < today) ? 'Includes overdue' : 'Due today'}
          icon={CalendarCheck}
          tone={data?.todayTasks.length ? 'warning' : 'success'}
        />
        <Stat
          label="Focus today"
          value={`${data?.focusTodayMin ?? 0}m`}
          hint={`Goal ${settings.dailyGoalMinutes}m · ${goalPct}%`}
          icon={Timer}
          tone="default"
        />
        <Stat
          label="Streak"
          value={data?.streak ?? 0}
          hint={data?.streak ? 'days in a row' : 'Review or focus to start'}
          icon={Flame}
          tone={data?.streak ? 'warning' : 'default'}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Today’s plan</CardTitle>
              <CardDescription>Tasks due today and anything overdue.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/planner">
                Planner <ArrowRight aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addQuickTask()
              }}
            >
              <label htmlFor="quick-task" className="sr-only">
                Add a task for today
              </label>
              <Input
                id="quick-task"
                placeholder="Add a task for today…"
                value={quickTask}
                onChange={(e) => setQuickTask(e.target.value)}
                autoComplete="off"
              />
              <Button type="submit" disabled={!quickTask.trim()} aria-label="Add task">
                <Plus aria-hidden />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </form>

            {data && data.todayTasks.length === 0 ? (
              <p className="rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing due today. Add a task above or open the planner.
              </p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {data?.todayTasks.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Checkbox
                      id={`dash-task-${t.id}`}
                      aria-label={`Mark “${t.title}” done`}
                      onCheckedChange={() => completeTask(t.id)}
                    />
                    <label htmlFor={`dash-task-${t.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                      <span className="block truncate">{t.title}</span>
                    </label>
                    {t.dueDate && t.dueDate < today ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : null}
                    <SubjectChip subjectId={t.subjectId} size="xs" className="hidden sm:inline-flex" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focus goal</CardTitle>
            <CardDescription>
              {data?.focusTodayMin ?? 0} of {settings.dailyGoalMinutes} minutes today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={goalPct} tone={goalPct >= 100 ? 'success' : 'primary'} aria-label="Daily focus goal progress" />
            <Button className="w-full" onClick={() => navigate('/focus?start=1')}>
              <Timer aria-hidden /> Start {settings.pomodoroMinutes}-minute session
            </Button>
            <div className="rounded-xl bg-muted/60 p-3 text-sm">
              <p className="font-medium">Practice accuracy (7 days)</p>
              <p className="mt-0.5 text-muted-foreground">
                {data?.accuracy !== null && data?.accuracy !== undefined
                  ? `${data.accuracy}% across ${data.attemptsCount} questions`
                  : 'No questions attempted yet.'}
              </p>
              <Button asChild variant="link" size="sm" className="mt-1 h-auto px-0">
                <Link to="/practice">
                  Practice now <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Flashcards due</CardTitle>
              <CardDescription>Spaced repetition keeps formulas fresh.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/flashcards">
                All decks <ArrowRight aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data && data.dueCount === 0 ? (
              <p className="rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No cards due. Come back later or add new cards from your notes.
              </p>
            ) : (
              <ul className="space-y-2">
                {data?.decks
                  .filter((d) => (data.dueByDeck.get(d.id) ?? 0) > 0)
                  .map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <SubjectChip subjectId={d.subjectId} size="xs" />
                      </div>
                      <Button asChild size="sm">
                        <Link to={`/flashcards/${d.id}/review`}>Review {data.dueByDeck.get(d.id)}</Link>
                      </Button>
                    </li>
                  ))}
                {data && data.dueCount > 0 ? (
                  <li>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/flashcards/review">Review everything due ({data.dueCount})</Link>
                    </Button>
                  </li>
                ) : null}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Recent notes</CardTitle>
              <CardDescription>Pick up where you left off.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/notes?new=1">
                <Plus aria-hidden /> New
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data && data.notes.length === 0 ? (
              <p className="rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No notes yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {data?.notes.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={`/notes/${n.id}`}
                      className="flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-accent/60"
                    >
                      <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{n.title || 'Untitled'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {n.plainText.slice(0, 90) || 'Empty note'}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(n.updatedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction to="/notes?new=1" icon={BookOpen} label="New note" />
        <QuickAction to="/flashcards" icon={Layers} label="Flashcards" />
        <QuickAction to="/practice" icon={Target} label="Practice" />
        <QuickAction to="/focus" icon={Timer} label="Focus" />
      </section>
    </div>
  )
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-sm font-medium shadow-soft transition-colors hover:bg-accent/60"
    >
      <Icon className="size-5 text-primary" aria-hidden />
      {label}
    </Link>
  )
}

function OnboardingDialog() {
  const settings = useSettings()
  const [name, setName] = useState('')
  const [examId, setExamId] = useState(settings.examId)
  const [open, setOpen] = useState(!settings.onboarded)

  const finish = () => {
    updateSettings({ displayName: name.trim(), examId, onboarded: true })
    setOpen(false)
    toast.success('You’re all set. Everything is saved on this device.')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          updateSettings({ onboarded: true })
        }
        setOpen(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to StudyWise</DialogTitle>
          <DialogDescription>
            Tell us what you’re preparing for. You can change this any time in Settings. No account
            needed — your data stays on this device.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            finish()
          }}
        >
          <Field label="What should we call you?" htmlFor="ob-name" hint="Optional">
            <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="given-name" />
          </Field>
          <Field label="Primary exam" htmlFor="ob-exam">
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger id="ob-exam">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXAMS.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="submit">Get started</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
