import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
} from 'date-fns'

/** yyyy-MM-dd in local time */
export function toDateKey(date: Date | number = new Date()) {
  return format(date, 'yyyy-MM-dd')
}

export function fromDateKey(key: string) {
  return startOfDay(parseISO(key))
}

export function todayKey() {
  return toDateKey(new Date())
}

export function offsetDateKey(days: number, from = new Date()) {
  return toDateKey(addDays(from, days))
}

export function describeDueDate(key: string | null) {
  if (!key) return { label: 'No date', tone: 'muted' as const }
  const date = fromDateKey(key)
  if (isToday(date)) return { label: 'Today', tone: 'primary' as const }
  if (isTomorrow(date)) return { label: 'Tomorrow', tone: 'default' as const }
  if (isYesterday(date)) return { label: 'Yesterday', tone: 'overdue' as const }
  const diff = differenceInCalendarDays(date, new Date())
  if (diff < 0) return { label: `${-diff} days overdue`, tone: 'overdue' as const }
  if (diff < 7) return { label: format(date, 'EEEE'), tone: 'default' as const }
  return { label: format(date, 'd MMM'), tone: 'default' as const }
}

export function relativeTime(ts: number) {
  const diff = Date.now() - ts
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return format(ts, 'd MMM')
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}
