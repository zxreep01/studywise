import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'
import { Coffee, Pause, Play, RotateCcw, SkipForward, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { useSettings } from '@/lib/settings'
import { toDateKey } from '@/lib/dates'
import { cn, formatDuration } from '@/lib/utils'
import { SUBJECTS, subjectById } from '@/data/syllabus'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SubjectChip } from '@/components/ui/badge'
import { PageHeader, Progress } from '@/components/ui/misc'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Mode = 'focus' | 'break'
const NONE = '__none__'

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.65)
  } catch {
    /* audio is best-effort */
  }
}

export default function FocusPage() {
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>('focus')
  const [running, setRunning] = useState(false)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(settings.pomodoroMinutes * 60)
  const [subjectId, setSubjectId] = useState<string>(NONE)
  const [taskId, setTaskId] = useState<string>(NONE)
  const [paused, setPaused] = useState(false)
  const sessionStart = useRef<number | null>(null)
  const pausedRemaining = useRef<number | null>(null)

  const duration = (mode === 'focus' ? settings.pomodoroMinutes : settings.breakMinutes) * 60
  // Idle shows the full duration (so settings changes are reflected); running/paused shows the ticking value.
  const shown = running || paused ? remaining : duration

  const openTasks = useLiveQuery(() => db.tasks.where('status').equals('todo').toArray(), [], [])

  const stats = useLiveQuery(async () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const weekStart = start.getTime() - 6 * 86400000
    const sessions = await db.focusSessions.where('startedAt').aboveOrEqual(weekStart).toArray()
    const today = sessions.filter((s) => s.startedAt >= start.getTime()).sort((a, b) => b.startedAt - a.startedAt)
    const byDay = new Map<string, number>()
    for (let i = 6; i >= 0; i--) byDay.set(toDateKey(Date.now() - i * 86400000), 0)
    for (const s of sessions) {
      const k = toDateKey(s.startedAt)
      byDay.set(k, (byDay.get(k) ?? 0) + s.durationSec)
    }
    const bySubject = new Map<string, number>()
    for (const s of sessions) {
      const k = s.subjectId ?? 'none'
      bySubject.set(k, (bySubject.get(k) ?? 0) + s.durationSec)
    }
    return {
      today,
      todaySec: today.reduce((a, s) => a + s.durationSec, 0),
      weekSec: sessions.reduce((a, s) => a + s.durationSec, 0),
      byDay: Array.from(byDay.entries()),
      bySubject: Array.from(bySubject.entries()).sort((a, b) => b[1] - a[1]),
    }
  }, [])

  const logSession = useCallback(
    async (seconds: number) => {
      if (mode !== 'focus' || seconds < 60 || sessionStart.current === null) return
      await db.focusSessions.add({
        id: nanoid(),
        startedAt: sessionStart.current,
        endedAt: Date.now(),
        durationSec: Math.round(seconds),
        kind: 'pomodoro',
        subjectId: subjectId === NONE ? null : subjectId,
        taskId: taskId === NONE ? null : taskId,
      })
    },
    [mode, subjectId, taskId],
  )

  const reset = useCallback(
    (nextMode: Mode = mode) => {
      setRunning(false)
      setEndAt(null)
      setPaused(false)
      pausedRemaining.current = null
      sessionStart.current = null
      setMode(nextMode)
      setRemaining((nextMode === 'focus' ? settings.pomodoroMinutes : settings.breakMinutes) * 60)
    },
    [mode, settings.pomodoroMinutes, settings.breakMinutes],
  )

  const start = useCallback(() => {
    const secs = pausedRemaining.current ?? duration
    if (sessionStart.current === null) sessionStart.current = Date.now()
    setEndAt(Date.now() + secs * 1000)
    setRunning(true)
    setPaused(false)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined)
    }
  }, [duration])

  const pause = useCallback(() => {
    if (endAt) pausedRemaining.current = Math.max(0, Math.round((endAt - Date.now()) / 1000))
    setRunning(false)
    setEndAt(null)
    setPaused(true)
  }, [endAt])

  const complete = useCallback(async () => {
    beep()
    setRunning(false)
    setEndAt(null)
    if (mode === 'focus') {
      await logSession(duration)
      toast.success('Focus session complete. Take a short break.')
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification('StudyWise', { body: 'Focus session complete. Time for a break.' })
      }
      reset('break')
    } else {
      toast('Break over. Ready for another round?')
      reset('focus')
    }
  }, [mode, duration, logSession, reset])

  const skip = useCallback(async () => {
    if (mode === 'focus' && sessionStart.current !== null) {
      const elapsed = duration - (endAt ? Math.round((endAt - Date.now()) / 1000) : (pausedRemaining.current ?? duration))
      await logSession(elapsed)
      if (elapsed >= 60) toast.success(`Logged ${Math.round(elapsed / 60)} minutes of focus.`)
    }
    reset(mode === 'focus' ? 'break' : 'focus')
  }, [mode, duration, endAt, logSession, reset])

  // Tick based on wall-clock end time so backgrounded tabs stay accurate.
  useEffect(() => {
    if (!running || !endAt) return
    const tick = () => {
      const left = Math.max(0, Math.round((endAt - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) complete()
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [running, endAt, complete])

  useEffect(() => {
    document.title = running ? `${formatDuration(shown)} · ${mode === 'focus' ? 'Focus' : 'Break'} · StudyWise` : 'StudyWise'
    return () => {
      document.title = 'StudyWise'
    }
  }, [running, shown, mode])

  useEffect(() => {
    if (params.get('start') !== '1') return
    setParams({}, { replace: true })
    // Defer so the timer starts after the initial paint rather than mid-render.
    const id = window.setTimeout(start, 0)
    return () => window.clearTimeout(id)
  }, [params, setParams, start])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('[role="combobox"]'))) return
      if (e.key === ' ' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        if (running) pause()
        else start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, pause, start])

  const pct = useMemo(() => ((duration - shown) / duration) * 100, [duration, shown])
  const circumference = 2 * Math.PI * 88
  const dash = circumference - (pct / 100) * circumference
  const goalPct = Math.min(100, Math.round(((stats?.todaySec ?? 0) / 60 / settings.dailyGoalMinutes) * 100))
  const maxDay = Math.max(1, ...(stats?.byDay.map(([, s]) => s) ?? [1]))

  return (
    <div>
      <PageHeader title="Focus" description="Pomodoro sessions, logged against subjects so you can see where your time goes." />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="flex flex-col items-center p-6 md:p-10">
            <div className="mb-6 inline-flex rounded-xl bg-muted p-1" role="tablist" aria-label="Timer mode">
              {(['focus', 'break'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  disabled={running}
                  onClick={() => reset(m)}
                  className={cn(
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-4 text-sm font-medium capitalize transition-colors disabled:cursor-not-allowed',
                    mode === m ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground',
                  )}
                >
                  {m === 'focus' ? <Timer className="size-4" aria-hidden /> : <Coffee className="size-4" aria-hidden />}
                  {m}
                </button>
              ))}
            </div>

            <div className="relative size-56 md:size-64" role="timer" aria-live="off" aria-label={`${mode} timer`}>
              <svg viewBox="0 0 200 200" className="size-full -rotate-90">
                <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
                <circle
                  cx="100"
                  cy="100"
                  r="88"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dash}
                  className={cn('transition-[stroke-dashoffset] duration-300', mode === 'focus' ? 'text-primary' : 'text-success')}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold tabular-nums tracking-tight md:text-6xl">{formatDuration(shown)}</span>
                <span className="mt-1 text-sm text-muted-foreground">{running ? (mode === 'focus' ? 'Stay with it' : 'Breathe') : 'Paused'}</span>
              </div>
            </div>
            <p className="sr-only" aria-live="polite">
              {running ? `${mode} timer running, ${Math.ceil(shown / 60)} minutes left` : 'Timer paused'}
            </p>

            <div className="mt-6 flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => reset()} aria-label="Reset timer" disabled={!running && !paused}>
                <RotateCcw aria-hidden />
              </Button>
              <Button size="lg" className="min-w-36" onClick={running ? pause : start}>
                {running ? <Pause aria-hidden /> : <Play aria-hidden />}
                {running ? 'Pause' : paused ? 'Resume' : 'Start'}
              </Button>
              <Button variant="outline" size="icon" onClick={skip} aria-label={mode === 'focus' ? 'Finish early and take a break' : 'Skip break'}>
                <SkipForward aria-hidden />
              </Button>
            </div>

            <div className="mt-6 grid w-full max-w-md gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="focus-subject" className="text-xs font-medium text-muted-foreground">
                  Subject
                </label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger id="focus-subject">
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
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="focus-task" className="text-xs font-medium text-muted-foreground">
                  Working on
                </label>
                <Select value={taskId} onValueChange={setTaskId}>
                  <SelectTrigger id="focus-task">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No specific task</SelectItem>
                    {openTasks?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Today</CardTitle>
              <CardDescription>
                {Math.round((stats?.todaySec ?? 0) / 60)} of {settings.dailyGoalMinutes} minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={goalPct} tone={goalPct >= 100 ? 'success' : 'primary'} aria-label="Daily goal progress" />
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Last 7 days</p>
                <div className="flex h-24 items-end gap-1.5" role="img" aria-label={`Focus minutes per day: ${stats?.byDay.map(([d, s]) => `${format(new Date(d), 'EEE')} ${Math.round(s / 60)}`).join(', ')}`}>
                  {stats?.byDay.map(([d, s]) => (
                    <div key={d} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={cn('w-full rounded-t-md transition-[height]', d === toDateKey() ? 'bg-primary' : 'bg-primary/40')}
                          style={{ height: `${Math.max(4, (s / maxDay) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(d), 'EEEEE')}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{Math.round((stats?.weekSec ?? 0) / 60)} minutes this week</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By subject</CardTitle>
              <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent>
              {stats && stats.bySubject.length ? (
                <ul className="space-y-2">
                  {stats.bySubject.map(([sid, sec]) => (
                    <li key={sid} className="flex items-center justify-between text-sm">
                      {sid === 'none' ? <span className="text-muted-foreground">Unassigned</span> : <SubjectChip subjectId={sid} />}
                      <span className="tabular-nums text-muted-foreground">{Math.round(sec / 60)}m</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Finish a session to see the breakdown.</p>
              )}
            </CardContent>
          </Card>

          {stats && stats.today.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Sessions today</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {stats.today.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">{format(s.startedAt, 'HH:mm')}</span>
                      <span>{s.subjectId ? subjectById[s.subjectId]?.name : 'General'}</span>
                      <span className="tabular-nums font-medium">{Math.round(s.durationSec / 60)}m</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
