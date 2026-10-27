import { useEffect } from 'react'
import { useSettings } from './settings'

export function ThemeSync() {
  const { theme } = useSettings()

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mql.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])

  return null
}
