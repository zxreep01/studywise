import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, HardDrive, Moon, Sun, SunMoon, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { clearAll, db, exportAll, importAll } from '@/lib/db'
import { useSettings, updateSettings, resetSettings, type Theme } from '@/lib/settings'
import { cn } from '@/lib/utils'
import { EXAMS } from '@/data/syllabus'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/misc'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

export default function SettingsPage() {
  const settings = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [eraseOpen, setEraseOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const counts = useLiveQuery(async () => ({
    notes: await db.notes.count(),
    cards: await db.cards.count(),
    tasks: await db.tasks.count(),
    reviews: await db.reviews.count(),
    attempts: await db.attempts.count(),
  }))

  const exportData = async () => {
    setBusy(true)
    try {
      const payload = await exportAll()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `studywise-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup downloaded')
    } finally {
      setBusy(false)
    }
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const payload = JSON.parse(await file.text())
      await importAll(payload, importMode)
      toast.success(importMode === 'replace' ? 'Backup restored' : 'Backup merged into your data')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not import this file.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const erase = async () => {
    await clearAll()
    resetSettings()
    localStorage.removeItem('studywise:seeded')
    toast.success('All local data erased')
    window.location.assign('/')
  }

  const numberField = (key: 'dailyGoalMinutes' | 'pomodoroMinutes' | 'breakMinutes' | 'newCardsPerDay', min: number, max: number) => ({
    type: 'number' as const,
    inputMode: 'numeric' as const,
    min,
    max,
    value: settings[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value)
      if (Number.isFinite(v)) updateSettings({ [key]: Math.min(max, Math.max(min, v)) })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Preferences are saved on this device." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Used to personalise the home screen and practice defaults.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="st-name">
            <Input id="st-name" value={settings.displayName} onChange={(e) => updateSettings({ displayName: e.target.value })} autoComplete="given-name" />
          </Field>
          <Field label="Primary exam" htmlFor="st-exam">
            <Select value={settings.examId} onValueChange={(v) => updateSettings({ examId: v })}>
              <SelectTrigger id="st-exam">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Follows your system by default. Reduced-motion preferences are respected automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset>
            <legend className="sr-only">Theme</legend>
            <div className="grid grid-cols-3 gap-3 sm:max-w-md">
              {(
                [
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'system', label: 'System', icon: SunMoon },
                ] as { id: Theme; label: string; icon: typeof Sun }[]
              ).map((t) => (
                <label
                  key={t.id}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                    settings.theme === t.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
                  )}
                >
                  <input type="radio" name="theme" value={t.id} checked={settings.theme === t.id} onChange={() => updateSettings({ theme: t.id })} className="sr-only" />
                  <t.icon className={cn('size-5', settings.theme === t.id ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Study preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Daily focus goal (min)" htmlFor="st-goal">
            <Input id="st-goal" {...numberField('dailyGoalMinutes', 15, 900)} />
          </Field>
          <Field label="Focus length (min)" htmlFor="st-pomo">
            <Input id="st-pomo" {...numberField('pomodoroMinutes', 5, 120)} />
          </Field>
          <Field label="Break length (min)" htmlFor="st-break">
            <Input id="st-break" {...numberField('breakMinutes', 1, 60)} />
          </Field>
          <Field label="New cards per day" htmlFor="st-new">
            <Input id="st-new" {...numberField('newCardsPerDay', 5, 200)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-4" aria-hidden /> Your data
          </CardTitle>
          <CardDescription>
            Everything lives in this browser’s storage. Export a backup before clearing site data or switching devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {counts ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Object.entries(counts).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-muted/60 p-3">
                  <dt className="text-xs capitalize text-muted-foreground">{k}</dt>
                  <dd className="text-lg font-bold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Button onClick={exportData} loading={busy} variant="outline">
              <Download aria-hidden /> Export backup (JSON)
            </Button>
            <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-end">
              <Field label="Import mode" htmlFor="st-import-mode" className="sm:w-44">
                <Select value={importMode} onValueChange={(v) => setImportMode(v as 'merge' | 'replace')}>
                  <SelectTrigger id="st-import-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">Merge</SelectItem>
                    <SelectItem value="replace">Replace everything</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Button variant="outline" onClick={() => fileRef.current?.click()} loading={busy}>
                <Upload aria-hidden /> Import backup
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="Choose a backup file"
                onChange={(e) => onImport(e.target.files?.[0])}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Erase every note, card, task and session from this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setEraseOpen(true)}>
            <Trash2 aria-hidden /> Erase all local data
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        StudyWise prototype · v{__APP_VERSION__} · local-first, no account required
      </p>

      <AlertDialog open={eraseOpen} onOpenChange={setEraseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erase all local data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes everything stored by StudyWise in this browser. Export a backup first if you might want it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction destructive onClick={erase}>
              Erase everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
