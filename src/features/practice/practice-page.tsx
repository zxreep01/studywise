import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { AlertTriangle, ArrowRight, CheckCircle2, RotateCcw, Target, Timer, TrendingUp, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { db, type Attempt } from '@/lib/db'
import { useSettings, updateSettings } from '@/lib/settings'
import { cn, formatDuration, pluralize } from '@/lib/utils'
import { EXAMS, examById, subjectById } from '@/data/syllabus'
import { QUESTIONS, questionById, type Question } from '@/data/questions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, SubjectChip } from '@/components/ui/badge'
import { PageHeader, Progress, Stat } from '@/components/ui/misc'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field } from '@/components/ui/input'

type Mode = 'practice' | 'test'
type Stage =
  | { kind: 'setup' }
  | { kind: 'session'; sessionId: string; questions: Question[]; mode: Mode }
  | { kind: 'result'; sessionId: string; questions: Question[]; attempts: Attempt[]; mode: Mode; elapsedMs: number }

const ALL = '__all__'

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function PracticePage() {
  const [stage, setStage] = useState<Stage>({ kind: 'setup' })

  if (stage.kind === 'session') {
    return (
      <Session
        key={stage.sessionId}
        sessionId={stage.sessionId}
        questions={stage.questions}
        mode={stage.mode}
        onFinish={(attempts, elapsedMs) =>
          setStage({ kind: 'result', sessionId: stage.sessionId, questions: stage.questions, attempts, mode: stage.mode, elapsedMs })
        }
        onQuit={() => setStage({ kind: 'setup' })}
      />
    )
  }
  if (stage.kind === 'result') {
    return <Result {...stage} onAgain={() => setStage({ kind: 'setup' })} />
  }
  return <Setup onStart={(s) => setStage(s)} />
}

/* --------------------------------- Setup ---------------------------------- */

function Setup({ onStart }: { onStart: (s: Extract<Stage, { kind: 'session' }>) => void }) {
  const settings = useSettings()
  const [examId, setExamId] = useState(settings.examId)
  const [subjectId, setSubjectId] = useState(ALL)
  const [count, setCount] = useState('10')
  const [mode, setMode] = useState<Mode>('practice')

  const exam = examById[examId]
  const pool = useMemo(
    () => QUESTIONS.filter((q) => q.examIds.includes(examId) && (subjectId === ALL || q.subjectId === subjectId)),
    [examId, subjectId],
  )

  const history = useLiveQuery(async () => {
    const attempts = await db.attempts.toArray()
    const total = attempts.length
    const correct = attempts.filter((a) => a.correct).length
    const byTopic = new Map<string, { correct: number; total: number; subjectId: string }>()
    for (const a of attempts) {
      const q = questionById[a.questionId]
      if (!q) continue
      const t = byTopic.get(q.topic) ?? { correct: 0, total: 0, subjectId: q.subjectId }
      t.total++
      if (a.correct) t.correct++
      byTopic.set(q.topic, t)
    }
    const weak = Array.from(byTopic.entries())
      .filter(([, t]) => t.total >= 2 && t.correct / t.total < 0.6)
      .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
      .slice(0, 4)
    const sessions = await db.practiceSessions.where('startedAt').above(0).reverse().limit(5).toArray()
    return { total, correct, weak, sessions: sessions.filter((s) => s.endedAt) }
  }, [])

  const start = async () => {
    const n = Math.min(Number(count), pool.length)
    if (n === 0) {
      toast.error('No questions match that filter yet.')
      return
    }
    // Prefer questions not seen recently.
    const seen = new Set((await db.attempts.orderBy('createdAt').reverse().limit(50).toArray()).map((a) => a.questionId))
    const fresh = shuffle(pool.filter((q) => !seen.has(q.id)))
    const rest = shuffle(pool.filter((q) => seen.has(q.id)))
    const questions = [...fresh, ...rest].slice(0, n)
    const sessionId = nanoid()
    await db.practiceSessions.add({
      id: sessionId,
      examId,
      subjectId: subjectId === ALL ? null : subjectId,
      questionIds: questions.map((q) => q.id),
      startedAt: Date.now(),
      endedAt: null,
      score: null,
      total: questions.length,
    })
    updateSettings({ examId })
    onStart({ kind: 'session', sessionId, questions, mode })
  }

  return (
    <div>
      <PageHeader title="Practice" description="Stock questions tagged by exam, subject and topic. Your mistakes become tomorrow’s revision." />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Start a session</CardTitle>
            <CardDescription>{pluralize(pool.length, 'question')} available for this filter.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Exam" htmlFor="pr-exam">
                <Select
                  value={examId}
                  onValueChange={(v) => {
                    setExamId(v)
                    setSubjectId(ALL)
                  }}
                >
                  <SelectTrigger id="pr-exam">
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
              <Field label="Subject" htmlFor="pr-subject">
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger id="pr-subject">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All subjects</SelectItem>
                    {exam?.subjectIds.map((sid) => (
                      <SelectItem key={sid} value={sid}>
                        {subjectById[sid]?.name ?? sid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Mode</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { id: 'practice', title: 'Practice', desc: 'Instant feedback and solutions after each question.', icon: Target },
                    { id: 'test', title: 'Timed test', desc: `Exam marking (+${exam?.marking.correct} / ${exam?.marking.wrong}). Solutions at the end.`, icon: Timer },
                  ] as const
                ).map((m) => (
                  <label
                    key={m.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                      mode === m.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
                    )}
                  >
                    <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="sr-only" />
                    <m.icon className={cn('mt-0.5 size-5 shrink-0', mode === m.id ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold">{m.title}</span>
                      <span className="block text-xs text-muted-foreground">{m.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Field label="Number of questions" htmlFor="pr-count">
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger id="pr-count" className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['5', '10', '15', '20'].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Button size="lg" onClick={start} disabled={pool.length === 0}>
              Start {mode === 'test' ? 'test' : 'practising'} <ArrowRight aria-hidden />
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Attempted" value={history?.total ?? 0} icon={Target} />
            <Stat
              label="Accuracy"
              value={history && history.total ? `${Math.round((history.correct / history.total) * 100)}%` : '–'}
              icon={TrendingUp}
              tone={history && history.total && history.correct / history.total >= 0.7 ? 'success' : 'default'}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning" aria-hidden /> Weak topics
              </CardTitle>
              <CardDescription>Topics under 60% accuracy. These feed your personalised revision.</CardDescription>
            </CardHeader>
            <CardContent>
              {history && history.weak.length ? (
                <ul className="space-y-3">
                  {history.weak.map(([topic, t]) => (
                    <li key={topic}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{topic}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {t.correct}/{t.total}
                        </span>
                      </div>
                      <Progress value={(t.correct / t.total) * 100} tone="warning" aria-label={`${topic} accuracy`} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Attempt a few questions and weak topics will surface here.</p>
              )}
            </CardContent>
          </Card>

          {history && history.sessions.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {history.sessions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2">
                      <span>{examById[s.examId]?.shortName ?? s.examId}{s.subjectId ? ` · ${subjectById[s.subjectId]?.name}` : ''}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {s.score} / {s.total}
                      </span>
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

/* -------------------------------- Session --------------------------------- */

function Session({
  sessionId,
  questions,
  mode,
  onFinish,
  onQuit,
}: {
  sessionId: string
  questions: Question[]
  mode: Mode
  onFinish: (attempts: Attempt[], elapsedMs: number) => void
  onQuit: () => void
}) {
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(0)
  const questionStart = useRef(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)

  const q = questions[index]
  const total = questions.length

  useEffect(() => {
    startedAt.current = Date.now()
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (revealed) nextButtonRef.current?.focus()
  }, [revealed])

  useEffect(() => {
    headingRef.current?.focus()
    questionStart.current = Date.now()
  }, [index])

  const record = async (choice: number | null) => {
    const attempt: Attempt = {
      id: nanoid(),
      sessionId,
      questionId: q.id,
      chosen: choice,
      correct: choice === q.answer,
      timeMs: Date.now() - questionStart.current,
      createdAt: Date.now(),
    }
    await db.attempts.add(attempt)
    return attempt
  }

  const finish = async (all: Attempt[]) => {
    const correct = all.filter((a) => a.correct).length
    await db.practiceSessions.update(sessionId, { endedAt: Date.now(), score: correct })
    onFinish(all, Date.now() - startedAt.current)
  }

  const submit = async () => {
    if (chosen === null) return
    const attempt = await record(chosen)
    const next = [...attempts, attempt]
    setAttempts(next)
    if (mode === 'practice') {
      setRevealed(true)
    } else {
      advance(next)
    }
  }

  const advance = (all: Attempt[] = attempts) => {
    setChosen(null)
    setRevealed(false)
    if (index + 1 >= total) finish(all)
    else setIndex(index + 1)
  }

  const skipQuestion = async () => {
    const attempt = await record(null)
    const next = [...attempts, attempt]
    setAttempts(next)
    advance(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const n = Number(e.key)
      if (!revealed && n >= 1 && n <= q.options.length) {
        setChosen(n - 1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (revealed) advance()
        else submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={onQuit}>
          Quit
        </Button>
        <div className="flex items-center gap-3 text-sm text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1">
            <Timer className="size-4" aria-hidden /> {formatDuration(elapsed / 1000)}
          </span>
          <span aria-live="polite">
            {index + 1} / {total}
          </span>
        </div>
      </div>
      <Progress value={((index + (revealed ? 1 : 0)) / total) * 100} aria-label="Session progress" className="mb-6" />

      <article className="rounded-2xl border bg-card shadow-soft animate-slide-up" key={q.id}>
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3">
          <SubjectChip subjectId={q.subjectId} size="xs" />
          <Badge variant="muted">{q.topic}</Badge>
          <Badge variant={q.difficulty === 'hard' ? 'warning' : q.difficulty === 'medium' ? 'secondary' : 'muted'} className="capitalize">
            {q.difficulty}
          </Badge>
        </div>
        <div className="px-6 py-6 md:px-8">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold leading-snug outline-none md:text-xl">
            {q.stem}
          </h2>

          <fieldset className="mt-6">
            <legend className="sr-only">Choose an answer</legend>
            <div className="grid gap-2.5">
              {q.options.map((opt, i) => {
                const isChosen = chosen === i
                const isAnswer = q.answer === i
                let tone = ''
                if (revealed) {
                  if (isAnswer) tone = 'border-success bg-success/10'
                  else if (isChosen) tone = 'border-destructive bg-destructive/10'
                } else if (isChosen) {
                  tone = 'border-primary bg-primary/5'
                }
                return (
                  <label
                    key={i}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                      tone || 'border-border hover:bg-accent/40',
                      revealed && 'cursor-default',
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={i}
                      checked={isChosen}
                      disabled={revealed}
                      onChange={() => setChosen(i)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                        isChosen && !revealed && 'border-primary bg-primary text-primary-foreground',
                        revealed && isAnswer && 'border-success bg-success text-success-foreground',
                        revealed && isChosen && !isAnswer && 'border-destructive bg-destructive text-destructive-foreground',
                      )}
                      aria-hidden
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 pt-0.5">{opt}</span>
                    {revealed && isAnswer ? <CheckCircle2 className="size-5 text-success" aria-label="Correct answer" /> : null}
                    {revealed && isChosen && !isAnswer ? <XCircle className="size-5 text-destructive" aria-label="Your answer" /> : null}
                  </label>
                )
              })}
            </div>
          </fieldset>

          {revealed ? (
            <div className="mt-6 rounded-xl bg-muted/60 p-4 animate-fade-in" role="status">
              <p className={cn('text-sm font-semibold', chosen === q.answer ? 'text-success' : 'text-destructive')}>
                {chosen === q.answer ? 'Correct!' : 'Not quite.'}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{q.solution}</p>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 border-t p-4">
          {!revealed ? (
            <Button variant="ghost" onClick={skipQuestion}>
              Skip
            </Button>
          ) : (
            <span />
          )}
          {revealed ? (
            <Button ref={nextButtonRef} onClick={() => advance()}>
              {index + 1 >= total ? 'See results' : 'Next question'} <ArrowRight aria-hidden />
            </Button>
          ) : (
            <Button onClick={submit} disabled={chosen === null}>
              {mode === 'practice' ? 'Check answer' : index + 1 >= total ? 'Submit test' : 'Next'}
            </Button>
          )}
        </div>
      </article>
      <p className="mt-4 text-center text-xs text-muted-foreground">Press 1–4 to choose, Enter to continue.</p>
    </div>
  )
}

/* --------------------------------- Result --------------------------------- */

function Result({
  questions,
  attempts,
  mode,
  elapsedMs,
  onAgain,
}: Extract<Stage, { kind: 'result' }> & { onAgain: () => void }) {
  const settings = useSettings()
  const exam = examById[settings.examId]
  const correct = attempts.filter((a) => a.correct).length
  const wrong = attempts.filter((a) => a.chosen !== null && !a.correct).length
  const skipped = attempts.filter((a) => a.chosen === null).length
  const marks = exam ? correct * exam.marking.correct + wrong * exam.marking.wrong : correct
  const maxMarks = exam ? questions.length * exam.marking.correct : questions.length
  const pct = Math.round((correct / questions.length) * 100)
  const byAttempt = useMemo(() => new Map(attempts.map((a) => [a.questionId, a])), [attempts])

  const byTopic = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>()
    for (const q of questions) {
      const a = byAttempt.get(q.id)
      const t = map.get(q.topic) ?? { correct: 0, total: 0 }
      t.total++
      if (a?.correct) t.correct++
      map.set(q.topic, t)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
  }, [questions, byAttempt])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border bg-card p-8 text-center shadow-soft animate-slide-up">
        <div className={cn('mx-auto flex size-14 items-center justify-center rounded-2xl', pct >= 70 ? 'bg-success/10 text-success' : 'bg-warning/20 text-warning-foreground dark:text-warning')}>
          {pct >= 70 ? <CheckCircle2 className="size-7" aria-hidden /> : <TrendingUp className="size-7" aria-hidden />}
        </div>
        <h1 className="mt-4 text-2xl font-bold">{pct >= 90 ? 'Outstanding' : pct >= 70 ? 'Well done' : pct >= 50 ? 'Keep going' : 'Good effort'}</h1>
        <p className="mt-1 text-muted-foreground">
          {correct} of {questions.length} correct · {formatDuration(elapsedMs / 1000)}
          {mode === 'test' && exam ? ` · ${marks % 1 === 0 ? marks : marks.toFixed(2)} / ${maxMarks} marks` : ''}
        </p>
        <dl className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2">
          {[
            ['Correct', correct, 'text-success'],
            ['Wrong', wrong, 'text-destructive'],
            ['Skipped', skipped, 'text-muted-foreground'],
          ].map(([label, n, cls]) => (
            <div key={label} className="rounded-xl bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className={cn('text-xl font-bold tabular-nums', cls as string)}>{n}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={onAgain}>
            <RotateCcw aria-hidden /> New session
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By topic</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {byTopic.map(([topic, t]) => (
              <li key={topic}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{topic}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {t.correct}/{t.total}
                  </span>
                </div>
                <Progress value={(t.correct / t.total) * 100} tone={t.correct / t.total >= 0.7 ? 'success' : 'warning'} aria-label={`${topic} accuracy`} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section aria-labelledby="review-heading" className="space-y-3">
        <h2 id="review-heading" className="text-lg font-semibold">
          Review answers
        </h2>
        {questions.map((q, i) => {
          const a = byAttempt.get(q.id)
          const ok = a?.correct
          return (
            <details key={q.id} className="group rounded-xl border bg-card open:shadow-soft">
              <summary className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                {ok ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Correct" />
                ) : a?.chosen === null ? (
                  <span className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-muted-foreground/40" aria-label="Skipped" />
                ) : (
                  <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="Wrong" />
                )}
                <span className="flex-1">
                  <span className="font-medium">Q{i + 1}.</span> {q.stem}
                </span>
              </summary>
              <div className="border-t px-4 py-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Your answer: </span>
                  {a?.chosen !== null && a?.chosen !== undefined ? q.options[a.chosen] : <em>skipped</em>}
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Correct answer: </span>
                  <span className="font-medium text-success">{q.options[q.answer]}</span>
                </p>
                <p className="mt-2 rounded-lg bg-muted/60 p-3 leading-relaxed">{q.solution}</p>
              </div>
            </details>
          )
        })}
      </section>
    </div>
  )
}
