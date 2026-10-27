import {
  BookOpen,
  CalendarCheck,
  LayoutDashboard,
  Layers,
  Settings,
  Target,
  Timer,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Shown in the mobile bottom bar */
  mobile?: boolean
  shortcut?: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, mobile: true, shortcut: 'G H' },
  { to: '/notes', label: 'Notes', icon: BookOpen, mobile: true, shortcut: 'G N' },
  { to: '/flashcards', label: 'Flashcards', icon: Layers, mobile: true, shortcut: 'G F' },
  { to: '/planner', label: 'Planner', icon: CalendarCheck, mobile: true, shortcut: 'G P' },
  { to: '/practice', label: 'Practice', icon: Target, mobile: true, shortcut: 'G Q' },
  { to: '/focus', label: 'Focus', icon: Timer, shortcut: 'G T' },
  { to: '/settings', label: 'Settings', icon: Settings, shortcut: 'G S' },
]
