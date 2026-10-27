import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Moon, Search, Sun, SunMoon, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings, updateSettings } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { Kbd, Tooltip, TooltipProvider } from '@/components/ui/misc'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NAV_ITEMS } from './nav'
import { CommandPalette } from './command-palette'
import { Logo } from './logo'

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function ThemeMenu() {
  const { theme } = useSettings()
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon
  return (
    <DropdownMenu>
      <Tooltip content="Theme">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Theme: ${theme}`}>
            <Icon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => updateSettings({ theme: v as 'light' | 'dark' | 'system' })}
        >
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <SunMoon aria-hidden /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const online = useOnline()
  const location = useLocation()
  const navigate = useNavigate()

  // Global shortcuts: ⌘/Ctrl+K palette, "g" then letter to navigate.
  useEffect(() => {
    let pendingG = false
    let timer: number | undefined
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[role="dialog"]'))
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'g') {
        pendingG = true
        window.clearTimeout(timer)
        timer = window.setTimeout(() => (pendingG = false), 1200)
        return
      }
      if (pendingG) {
        const item = NAV_ITEMS.find((n) => n.shortcut?.endsWith(e.key.toUpperCase()))
        if (item) {
          e.preventDefault()
          navigate(item.to)
        }
        pendingG = false
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(timer)
    }
  }, [navigate])

  // Move focus to the main region on route change so screen-reader users land on new content.
  useEffect(() => {
    const main = document.getElementById('main')
    if (main && !location.search) main.focus({ preventScroll: true })
  }, [location.pathname, location.search])

  return (
    <TooltipProvider>
      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-4 z-[100] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-pop"
      >
        Skip to main content
      </a>

      <div className="flex min-h-dvh">
        {/* Desktop sidebar */}
        <aside
          className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex"
          aria-label="Primary"
        >
          <div className="flex h-16 items-center px-5">
            <Logo />
          </div>
          <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-sidebar-foreground/80 hover:bg-accent hover:text-accent-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn('size-[18px]', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground')}
                      aria-hidden
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut ? (
                      <span className="hidden gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 lg:flex" aria-hidden>
                        {item.shortcut.split(' ').map((k) => (
                          <Kbd key={k}>{k}</Kbd>
                        ))}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="border-t p-4 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <span className={cn('size-2 rounded-full', online ? 'bg-success' : 'bg-warning')} aria-hidden />
              {online ? 'Online · data stays on this device' : 'Offline · all features available'}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md md:h-16 md:px-8">
            <div className="md:hidden">
              <Logo compact />
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-9 w-64 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent sm:flex"
            >
              <Search className="size-4" aria-hidden />
              <span className="flex-1 text-left">Search or jump to…</span>
              <Kbd>⌘K</Kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Search"
              onClick={() => setPaletteOpen(true)}
            >
              <Search aria-hidden />
            </Button>
            {!online ? (
              <Tooltip content="You're offline. Everything still works.">
                <span className="inline-flex size-9 items-center justify-center text-warning" role="status" aria-label="Offline">
                  <WifiOff className="size-4" aria-hidden />
                </span>
              </Tooltip>
            ) : null}
            <ThemeMenu />
          </header>

          <main
            id="main"
            tabIndex={-1}
            className="flex-1 px-4 pb-24 pt-6 outline-none md:px-8 md:pb-10"
          >
            <div className="mx-auto w-full max-w-6xl animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Main navigation"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.filter((n) => n.mobile).map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-primary/10',
                      )}
                    >
                      <item.icon className="size-5" aria-hidden />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </TooltipProvider>
  )
}
