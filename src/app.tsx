import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, RouterProvider, useRouteError, Link } from 'react-router'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import { ThemeSync } from '@/lib/theme'
import { seedIfEmpty } from '@/lib/seed'
import { Button } from '@/components/ui/button'
import { PwaUpdatePrompt } from '@/components/pwa-update-prompt'

const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page'))
const NotesPage = lazy(() => import('@/features/notes/notes-page'))
const DecksPage = lazy(() => import('@/features/flashcards/decks-page'))
const DeckPage = lazy(() => import('@/features/flashcards/deck-page'))
const ReviewPage = lazy(() => import('@/features/flashcards/review-page'))
const PlannerPage = lazy(() => import('@/features/planner/planner-page'))
const FocusPage = lazy(() => import('@/features/focus/focus-page'))
const PracticePage = lazy(() => import('@/features/practice/practice-page'))
const SettingsPage = lazy(() => import('@/features/settings/settings-page'))

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

function RouteError() {
  const error = useRouteError() as { statusText?: string; message?: string } | undefined
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error?.statusText || error?.message || 'The page could not be displayed.'}
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="text-6xl font-black tracking-tight text-muted-foreground/40">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  )
}

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: 'notes', element: withSuspense(<NotesPage />) },
      { path: 'notes/:noteId', element: withSuspense(<NotesPage />) },
      { path: 'flashcards', element: withSuspense(<DecksPage />) },
      { path: 'flashcards/review', element: withSuspense(<ReviewPage />) },
      { path: 'flashcards/:deckId', element: withSuspense(<DeckPage />) },
      { path: 'flashcards/:deckId/review', element: withSuspense(<ReviewPage />) },
      { path: 'planner', element: withSuspense(<PlannerPage />) },
      { path: 'focus', element: withSuspense(<FocusPage />) },
      { path: 'practice', element: withSuspense(<PracticePage />) },
      { path: 'settings', element: withSuspense(<SettingsPage />) },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export function App() {
  useEffect(() => {
    seedIfEmpty().catch((err) => console.error('Seed failed', err))
  }, [])

  return (
    <>
      <ThemeSync />
      <RouterProvider router={router} />
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        toastOptions={{ classNames: { toast: 'font-sans' } }}
        className="mb-16 md:mb-0"
      />
      <PwaUpdatePrompt />
    </>
  )
}
