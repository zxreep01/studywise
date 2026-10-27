# StudyWise

Everything a student needs in one place — notes, flashcards, planner, focus timer and question
practice today; mind maps, slides, AI assistants, communities and more on the roadmap. Built
**local-first**: the prototype runs entirely in the browser, stores data on the device
(IndexedDB) and works offline as an installable PWA. No account, no server.

See [docs/PLAN.md](docs/PLAN.md) for the full product and engineering plan.

## What's in the prototype (Milestones M0–M1 + a practice slice)

| Area | Highlights |
|---|---|
| **Home** | Daily overview: cards due, tasks today, focus minutes vs goal, streak, quick-add task, recent notes |
| **Notes** | Block editor (TipTap): headings, lists, checklists, highlights, code, quotes, links · tags · subjects · full-text search · autosave · **"Make flashcard" from any selection** |
| **Flashcards** | Decks, cards, review with **FSRS** spaced repetition (`ts-fsrs`), keyboard grading (Space / 1–4), mastery stats |
| **Planner** | Tasks with due date, priority and subject · Today / Upcoming / All / Done views · undo on complete/delete |
| **Focus** | Pomodoro timer (wall-clock accurate in background tabs), subject/task tagging, 7-day chart, per-subject totals |
| **Practice** | Stock question pack tagged by exam (CBSE, JEE, NEET, UPSC, SSC, CAT), subject, topic, difficulty · practice & timed-test modes with exam marking · weak-topic detection · answer review |
| **Settings** | Name, primary exam, theme (light/dark/system), study preferences, JSON backup export/import, erase data |
| **Shell** | Command palette (Ctrl/⌘ K), `g`+letter navigation, responsive sidebar / bottom tab bar, offline indicator, PWA install + update prompt |

### Accessibility

- Semantic landmarks, skip link, focus moved to main content on route change
- Radix UI primitives for dialogs, menus, selects, tabs, checkboxes (focus trapping, roving focus, ARIA)
- Visible focus rings everywhere, keyboard shortcuts for every core flow
- Live regions for status (saving, review progress), labelled icon buttons and form fields
- `prefers-reduced-motion` and `prefers-color-scheme` respected; WCAG-AA-oriented colour tokens in both themes
- `eslint-plugin-jsx-a11y` enforced in CI lint

## Tech stack

React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Radix UI · TipTap 3 · Dexie (IndexedDB) ·
ts-fsrs · React Router 7 · cmdk · sonner · lucide-react · vite-plugin-pwa

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve dist/ locally
npm run lint
```

Requires Node 20+.

## Deploying on Render

The repository includes a [`render.yaml`](render.yaml) Blueprint that deploys the app as a
**Static Site** (no server needed — the prototype is fully client-side).

1. Push this repository to GitHub.
2. In the Render dashboard choose **New → Blueprint**, pick the repo and click **Apply**.
   Render reads `render.yaml`, runs `npm ci && npm run build` and publishes `dist/`.
3. Every push to the connected branch redeploys; pull-request previews are enabled.

Manual alternative (New → Static Site): build command `npm ci && npm run build`, publish
directory `dist`, and add a rewrite rule `/*` → `/index.html` so client-side routes work.

## Project layout

```
src/
├── app.tsx                 # router, error boundary, toaster, PWA prompt
├── index.css               # design tokens (OKLCH), themes, editor styles
├── components/
│   ├── layout/             # app shell, nav, command palette, logo
│   └── ui/                 # accessible primitives (button, dialog, select, …)
├── features/
│   ├── dashboard/  notes/  flashcards/  planner/  focus/  practice/  settings/
├── lib/                    # db (Dexie), fsrs, settings, dates, seed, utils
└── data/                   # exam/subject taxonomy, stock question pack
```

## Roadmap

The plan in `docs/PLAN.md` continues with visual thinking tools (mind maps, diagrams, slides),
then a backend with sync and a stock question-bank pipeline, then the AI layer (grounded
assistant, doubt solver, personalised questions), social features, and career/college explore.
