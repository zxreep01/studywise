import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  theme: Theme
  displayName: string
  examId: string
  dailyGoalMinutes: number
  pomodoroMinutes: number
  breakMinutes: number
  newCardsPerDay: number
  onboarded: boolean
}

const DEFAULTS: Settings = {
  theme: 'system',
  displayName: '',
  examId: 'jee',
  dailyGoalMinutes: 120,
  pomodoroMinutes: 25,
  breakMinutes: 5,
  newCardsPerDay: 20,
  onboarded: false,
}

const KEY = 'studywise:settings'
const THEME_KEY = 'studywise:theme'

let cache: Settings = load()
const listeners = new Set<() => void>()

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

function persist(next: Settings) {
  cache = next
  localStorage.setItem(KEY, JSON.stringify(next))
  localStorage.setItem(THEME_KEY, next.theme)
  listeners.forEach((l) => l())
}

export function getSettings() {
  return cache
}

export function updateSettings(patch: Partial<Settings>) {
  persist({ ...cache, ...patch })
}

export function resetSettings() {
  persist({ ...DEFAULTS })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = load()
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings, getSettings)
}
