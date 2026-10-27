# StudyWise — Product & Engineering Plan

> One place for everything a student needs: notes, mind maps, slides, flashcards, diagrams,
> a source-grounded AI assistant, a question bank, planning tools, and a study-focused social
> layer. Built **local-first**, with cloud sync, a database, and AI APIs layered on afterwards.

This document is the working plan. It is organised as:

1. [Vision & principles](#1-vision--principles)
2. [Who it is for](#2-who-it-is-for)
3. [Feature map](#3-feature-map)
4. [Architecture](#4-architecture)
5. [Tech stack](#5-tech-stack)
6. [Data model](#6-data-model)
7. [AI layer](#7-ai-layer)
8. [Roadmap (milestones, not dates)](#8-roadmap)
9. [Post-revenue features](#9-post-revenue-features)
10. [Monetisation](#10-monetisation)
11. [Repository layout](#11-repository-layout)
12. [Risks & open decisions](#12-risks--open-decisions)
13. [Immediate next steps](#13-immediate-next-steps)

---

## 1. Vision & principles

**Vision.** Replace the stack of Telegram groups, a notes app, a to-do app, a coaching app
(Physics Wallah style), NotebookLM, and a question-practice app with a single workspace that
works for a Class 10 student *and* a UPSC / JEE / NEET / CAT / GATE aspirant.

**Principles**

| Principle | What it means in practice |
|---|---|
| **Local-first** | Everything a single student does alone (notes, flashcards, planner, question practice, mind maps, slides, diagrams) must work with zero network, on a cheap Android phone, and data lives on the device first. Sync is an enhancement, never a requirement. |
| **One data model, many views** | A "note", a "flashcard", a "question", a "slide" and a "mind-map node" are all *blocks* that can reference each other. A flashcard is generated from a highlight in a note; a question is linked to the topic node in a mind map. No silos. |
| **AI is grounded, not generic** | Assistants answer from the student's own sources (NotebookLM model) plus curated stock content. Every AI answer cites what it used. |
| **Exam-aware by default** | Topics, questions and plans are tagged against a syllabus taxonomy (CBSE, JEE, NEET, UPSC, …) so the same notes feature works for school and competitive exams. |
| **Build the social layer thin** | Chats, channels and communities are table stakes, not the moat. Use boring, proven patterns; do not build Telegram. |
| **Cheap to run** | Students in India are price-sensitive. Design for low per-user cloud and AI cost: on-device inference where possible, small models by default, caching, BYO-key option. |

---

## 2. Who it is for

| Segment | Primary jobs-to-be-done | Exam taxonomies to seed |
|---|---|---|
| School (Class 6–12) | Notes from class, homework planner, revision flashcards, doubt solving from a photo of a textbook problem | CBSE, ICSE, state boards (start with NCERT syllabus as the backbone) |
| Engineering / medical aspirants | Massive question practice, PYQs, mock analysis, spaced revision of formulae, time-boxed schedules | JEE Main/Advanced, NEET, BITSAT, CUET |
| Government / management aspirants | Current-affairs channels, long-form notes, mind maps for revision, essay practice, college/career exploration | UPSC CSE, SSC CGL, Banking (IBPS/SBI), CAT, GATE |
| Teachers / small coaching (later) | Sell batches, publish DPPs, run live classes, broadcast via channels | n/a — they bring their own |

Mobile (Android) is the primary surface for all three student segments; web/desktop is secondary
but important for long-form notes, slides and mind maps.

---

## 3. Feature map

Features are grouped by the *subsystem* that owns them. Each feature is tagged with its
first milestone (see [Roadmap](#8-roadmap)).

### 3.1 Workspace (personal, offline-capable)

| Feature | Description | First milestone |
|---|---|---|
| **Notes** | Block-based rich text editor (headings, lists, math/LaTeX, code, images, tables, embeds, callouts, highlights). Backlinks and tags. Notes are the hub every other artefact links back to. | M1 |
| **Flashcards** | Decks with FSRS spaced repetition. Card types: basic, cloze, image-occlusion, formula. Create manually, from a highlight in a note, or AI-generated from a source. | M1 |
| **To-do planner** | Tasks with due dates, subject/topic tags, priority, recurring tasks, "today / this week / backlog" views. | M1 |
| **Task scheduler** | Calendar + time-blocking. Turns a syllabus + exam date into a study plan (initially rule-based, later AI). Pomodoro timer logs sessions against topics. | M1 |
| **Mind maps** | Infinite-canvas node graph. Nodes can be plain text or links to notes/questions/flashcards. Auto-layout, collapse/expand, export PNG. AI: generate a map from a note or topic. | M2 |
| **Diagrams** | Freehand + shape whiteboard (Excalidraw-class). Embedded inside notes and slides. | M2 |
| **Slide decks** | Slides composed of the same blocks as notes; present mode; export PDF. AI: outline → deck. | M2 |
| **Animations** | v1: step-through "animated diagrams" (keyframed states on the whiteboard/slide, play forward/back). v2 (post-revenue, AI Playground): AI-generated Manim-style explainer videos rendered server-side. | M2 / M7 |

### 3.2 Practice

| Feature | Description | First milestone |
|---|---|---|
| **Question bank — stock** | Curated questions tagged by exam, subject, chapter, topic, difficulty, year (PYQs), type (MCQ single/multi, numeric, assertion-reason, subjective). Stored locally as downloadable packs so practice is offline. | M3 |
| **Question bank — personalised** | AI-generated questions from the student's own notes and from their weak topics (derived from attempt history). Mistake notebook auto-populated from wrong answers. | M4 |
| **Practice & tests** | Topic practice, timed mocks with exam-accurate marking schemes, review mode with solutions, analytics (accuracy, speed, topic heat-map). | M3 |

### 3.3 AI

| Feature | Description | First milestone |
|---|---|---|
| **Assistants (NotebookLM-style)** | A notebook = a set of sources (PDFs, notes, web pages, YouTube transcripts, images). Chat grounded only in those sources with citations. Generate summaries, FAQs, study guides, flashcards, mind maps, slide outlines, and later an audio overview. | M4 |
| **Doubt solver** | Snap a photo / paste a problem → step-by-step solution, with "hint only" mode and a "similar questions" follow-up pulled from the question bank. Escalation path: post to a community if the student still doesn't get it. | M4 |
| **AI playground** | Post-revenue: free-form model workbench, compare models, prompt library, Manim/code sandbox. | M7 |

### 3.4 Social

| Feature | Description | First milestone |
|---|---|---|
| **Friends & chats** | 1:1 and small-group chat, share any artefact (note, deck, question, map) as a rich card. Offline outbox. | M5 |
| **Channels (Telegram-like)** | One-to-many broadcast with admins, pinned posts, files, scheduled posts. Used by teachers, exam-news publishers, and the product itself (daily current affairs). | M5 |
| **Communities (Reddit-like)** | Topic/exam-based communities with posts, comments, votes, flairs, basic moderation (report, remove, ban, automod keyword rules). | M5 |

### 3.5 Explore

| Feature | Description | First milestone |
|---|---|---|
| **Career explore** | Career paths → required exams → typical timelines → salary bands → recommended communities/channels. | M6 |
| **College details** | Searchable college database (NIRF rank, courses, fees, cutoffs by exam/category, placements, location). "Predict my colleges" from a score/rank. | M6 |

### 3.6 Post-revenue

Live streams, AI playground, study automations, and teacher storefronts — see [§9](#9-post-revenue-features).

---

## 4. Architecture

### 4.1 Local-first shape

```
┌──────────────────────────── Client (web / Android / iOS / desktop) ────────────────────────────┐
│                                                                                                │
│  UI (React)                                                                                    │
│    │                                                                                           │
│    ├── Relational store ── SQLite on device (todos, schedule, cards, reviews, questions,        │
│    │                        attempts, notebook metadata, chat outbox, settings)                │
│    │                                                                                           │
│    ├── Document store ──── Yjs CRDT docs (notes, mind maps, diagrams, slide decks)              │
│    │                        persisted in IndexedDB / SQLite blobs                              │
│    │                                                                                           │
│    ├── Blob store ──────── images, PDFs, audio (OPFS / filesystem), content-addressed           │
│    │                                                                                           │
│    └── Local AI (optional) ── on-device small model + local embeddings for offline search/QA   │
│                                                                                                │
│  Sync engine (added in M3) ── background, resumable, conflict-free                             │
└──────────────────────────────────────────┬─────────────────────────────────────────────────────┘
                                           │ HTTPS / WebSocket
┌──────────────────────────────────────────▼─────────────────────────────────────────────────────┐
│  API (auth, sync, AI gateway, social, payments)   Realtime (chat, presence, doc awareness)      │
│  Postgres (+ pgvector)   Object storage   Redis   Job workers (ingestion, embeddings, renders)   │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Two kinds of data, two kinds of sync:

* **Structured rows** (tasks, cards, reviews, attempts, memberships…) live in **SQLite on the
  device** and sync row-wise with Postgres via a sync engine. Writes are applied locally first
  and queued; the server is the arbiter for shared/multi-user rows.
* **Rich documents** (notes, maps, diagrams, decks) are **CRDTs (Yjs)**. They merge without
  conflicts, support real-time collaboration later for free, and are persisted as binary updates
  both on device and on the server.

Everything in [§3.1](#31-workspace-personal-offline-capable) and offline question practice must
be fully usable before the sync engine exists (Milestones M1–M2 ship with no backend at all).

### 4.2 Client platform decision

The feature set is dominated by **DOM-heavy editors** (rich text, whiteboard, node graph,
slides). Native re-implementations of those on React Native would multiply the work several
times over. Therefore:

* **Web-first PWA** (React + TypeScript) is the single codebase.
* **Android/iOS** ship via **Capacitor** wrapping the same web app, with native plugins for
  SQLite, filesystem, camera (doubt solver), push notifications, and background sync.
* **Desktop** ships via **Tauri** (small binary, same web app, native SQLite via plugin).
* Re-evaluate a React Native shell for specific screens (chat, planner) only if measured
  performance on low-end Android demands it.

### 4.3 Backend shape

A modular monolith in TypeScript, split into deployable services only when load requires:

* `api` — REST/RPC for auth, sync endpoints, question packs, explore data, payments.
* `realtime` — WebSocket server for chat, channels, presence, and Yjs document awareness.
* `worker` — background jobs: source ingestion (PDF → text → chunks → embeddings), AI
  generation jobs, animation renders, scheduled channel posts, notifications.
* `ai-gateway` (module inside `api`) — provider-agnostic model calls with per-user quotas,
  caching, cost accounting, and BYO-key support.

---

## 5. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | One language across client, server, sync, AI tooling |
| Monorepo | pnpm workspaces + Turborepo | Shared packages between apps |
| Web app | React 19 + Vite + TanStack Router/Query | Fast dev, PWA-friendly, no server requirement for M1 |
| Mobile | Capacitor 6 (Android first) | Reuse DOM editors; native SQLite/camera/push plugins |
| Desktop | Tauri 2 | Tiny binaries, native SQLite |
| Local DB | SQLite — `wa-sqlite` over OPFS on web, `@capacitor-community/sqlite` on mobile, `tauri-plugin-sql` on desktop — with **Drizzle ORM** for a single shared schema | Same schema and queries across all clients |
| Rich docs | **Yjs** + `y-indexeddb` (web) / SQLite blob persistence (native) | Industry-standard CRDT; TipTap, Excalidraw, and React Flow all have Yjs bindings |
| Notes editor | **TipTap** (ProseMirror) + KaTeX for math | Block editor, extensible, Yjs collaboration built in |
| Diagrams | **Excalidraw** (embedded) | Open source, excellent UX, exports, Yjs-friendly |
| Mind maps | **React Flow (@xyflow/react)** + ELK/dagre auto-layout | Node-graph canvas with custom nodes |
| Slides | Custom renderer over TipTap blocks; export via browser print → PDF | Reuses the note block model |
| Animations v1 | **Motion** (framer-motion) keyframed states over Excalidraw/slide elements | Lightweight, no server |
| Spaced repetition | **ts-fsrs** | Modern FSRS scheduler, open source |
| Sync engine | **PowerSync** *or* **ElectricSQL** (decide at M3 start; see §12) | Postgres ↔ SQLite partial replication with offline writes |
| Yjs sync | **Hocuspocus** server with Postgres persistence | Standard Yjs backend, auth hooks, awareness |
| API | **Hono** on Node 22 | Fast, typed, portable (Node/Bun/edge) |
| Server DB | **Postgres 16 + pgvector** via Drizzle | Relational + vector search in one DB |
| Cache / pubsub | Redis | Presence, rate limits, job queue |
| Jobs | BullMQ | Ingestion, AI jobs, renders, schedules |
| Object storage | S3-compatible (Cloudflare R2 to start) | Cheap egress for PDFs/images/video |
| Auth | Better Auth (email/password, Google, **phone OTP** via MSG91/Twilio) | Phone-first sign-in matters in India |
| Push | FCM + Web Push | Reminders, chat, channel posts |
| AI SDK | **Vercel AI SDK** (`ai`) as the provider abstraction | Swap OpenAI / Anthropic / Gemini / local without rewriting |
| Default models | Gemini Flash-class for cheap multimodal doubt solving & long-context notebooks; a stronger model behind a "deep" toggle; small open models via **Ollama** (desktop) / **WebLLM** (browser) for offline | Cost + multimodal + offline |
| Embeddings | Small multilingual embedding model (server) + a tiny on-device embedding model (web) for offline search | Hindi/English mixed content |
| PDF / OCR | `pdf.js` client-side text extraction; server OCR fallback for scans | Keep ingestion local when possible |
| Payments | Razorpay (India) + Stripe (international) | UPI is mandatory for Indian students |
| Live video (later) | **LiveKit** (self-hosted or cloud) | Open source WebRTC SFU; don't build streaming |
| Testing | Vitest, Playwright, Drizzle migrations tested against Postgres in CI | |
| Observability | OpenTelemetry → any backend; Sentry for client errors | |

---

## 6. Data model

High-level entities. Client (SQLite) and server (Postgres) share the same logical model; Drizzle
schemas live in `packages/db` with dialect-specific builds.

### 6.1 Core / workspace

```
User            id, handle, display_name, avatar, exam_profiles[], locale, settings
Workspace       id, owner_id, kind (personal | shared)             -- personal by default
Document        id, workspace_id, type (note | mindmap | diagram | deck), title, ydoc_ref, tags[], updated_at
Block           -- lives inside the Yjs doc, not as rows; blocks carry stable ids for cross-links
Link            from_ref, to_ref                                   -- any artefact → any artefact (backlinks)
Tag             id, name, kind (subject | chapter | topic | custom)
```

### 6.2 Syllabus taxonomy (stock, read-only, shipped as a pack)

```
Exam            id, name, body, pattern (marking scheme JSON)
Subject         id, exam_ids[], name
Chapter         id, subject_id, name, order
Topic           id, chapter_id, name, order, weightage
```

Every note, card, question and task can be tagged to a `Topic`; this is what powers weak-topic
detection, personalised questions and plan generation.

### 6.3 Practice & SRS

```
Deck            id, workspace_id, title, topic_ids[]
Card            id, deck_id, type, front, back, cloze_data, source_ref, topic_id
ReviewLog       card_id, rating, scheduled_at, reviewed_at, elapsed, state   -- FSRS inputs
Question        id, pack_id | workspace_id, type, stem, options[], answer, solution, difficulty,
                exam_id, topic_id, year, source, is_personalised
QuestionPack    id, exam_id, title, version, size, checksum, downloaded_at      -- offline packs
Attempt         id, question_id, session_id, chosen, correct, time_ms, created_at
PracticeSession id, kind (topic | mock | mistake), config JSON, score, started/ended
```

### 6.4 Planning

```
Task            id, title, notes, due_at, priority, status, topic_id, recurrence, parent_id
TimeBlock       id, task_id?, topic_id?, start_at, end_at, kind (study | break | class | revision)
StudyPlan       id, exam_id, target_date, config, generated_by (rule | ai)
FocusSession    id, topic_id, started_at, ended_at, kind (pomodoro | free)
```

### 6.5 AI notebooks

```
Notebook        id, workspace_id, title
Source          id, notebook_id, type (pdf | note | url | youtube | image | text), blob_ref, status
Chunk           id, source_id, text, position, embedding(vector)           -- server; subset cached locally
Conversation    id, notebook_id?, kind (notebook | doubt | general), model
Message         id, conversation_id, role, content, citations[], cost, created_at
Artifact        id, notebook_id, type (summary | faq | guide | cards | mindmap | outline), ref
```

### 6.6 Social

```
Friendship      user_a, user_b, status
Chat            id, kind (dm | group), member_ids[]
ChatMessage     id, chat_id, sender_id, body, attachments[], reply_to, created_at, local_status
Channel         id, slug, title, owner_id, admins[], subscriber_count, is_verified
ChannelPost     id, channel_id, body, attachments[], scheduled_at, published_at, pinned
Community       id, slug, title, exam_ids[], rules, mods[]
Post            id, community_id, author_id, title, body, flair, score, comment_count
Comment         id, post_id, parent_id, author_id, body, score
Vote            user_id, target_ref, value
Report          id, target_ref, reporter_id, reason, status
```

### 6.7 Explore

```
Career          id, title, summary, paths[] (exam_ids, degree_ids), salary_band, growth
College         id, name, state, city, type, nirf_rank, website
Course          id, college_id, name, degree, duration, fees, seats
Cutoff          course_id, exam_id, year, category, round, opening_rank, closing_rank
```

---

## 7. AI layer

### 7.1 Gateway design

* Single `ai` package wrapping the Vercel AI SDK with a **model registry**: each capability
  (`chat`, `vision`, `embed`, `tts`) maps to a default provider/model and allowed overrides.
* **Routing by task**: cheap fast model for flashcard/quiz generation and summarisation; stronger
  model for multi-step doubt solving and essay evaluation; local model when offline or when the
  user opts in.
* **Quotas & cost accounting** per user per period, stored with each `Message`. Free tier gets a
  daily budget; Pro raises it; BYO API key bypasses it.
* **Caching**: identical (prompt, sources) pairs are cached; generated artefacts (cards, maps,
  outlines) are stored as `Artifact`s so regeneration is explicit.
* **Safety**: exam-domain system prompts, refusal of off-topic abuse, PII scrubbing before
  sending user notes to a provider, and a per-workspace "never send to cloud" switch that forces
  local models.

### 7.2 Grounded assistant (NotebookLM model)

1. User adds sources → client extracts text when possible (`pdf.js`, note contents) → chunks
   are created locally.
2. Online: chunks are embedded server-side and stored in pgvector; a compact subset of
   embeddings is synced back for offline search.
   Offline: a tiny on-device embedding model indexes chunks for local retrieval.
3. Question → hybrid retrieval (BM25 over SQLite FTS5 + vector) → answer with inline citations
   `[source:chunk]` that deep-link to the exact passage.
4. One-click artefacts: summary, FAQ, study guide, flashcard deck, mind map, slide outline,
   practice questions — each lands back in the workspace as a normal document/deck/question set.
5. Later: audio overview (two-voice TTS script) for revision on the go.

### 7.3 Doubt solver

* Input: camera photo, gallery image, typed text, or a question from the bank.
* Vision model extracts the problem (LaTeX for math); the solver returns **hint → steps → final
  answer** progressively so the student can stop early.
* "Similar questions" retrieves bank questions by topic + embedding similarity.
* "Still stuck" posts the problem (with the AI attempt attached) to the relevant community.
* Every solved doubt can be saved to the mistake notebook and converted to a flashcard.

### 7.4 Personalised question generation

* Inputs: weak topics (accuracy < threshold and/or slow), recent notes, upcoming plan items.
* Generated questions are validated (answer-key self-consistency check with a second pass)
  before entering the user's bank with `is_personalised = true`; users can flag bad items.
* Difficulty calibration uses attempt history (simple Elo per topic to start).

### 7.5 Planning assistant

* Rule-based generator first (syllabus weightage × remaining days × daily hours).
* AI refinement later: natural-language edits ("I have school till 2pm on weekdays", "focus on
  Organic Chemistry this week").

---

## 8. Roadmap

Milestones are ordered by dependency, not calendar. Each has a definition of done (DoD).
M0–M2 have **no backend**; the backend first appears in M3.

### M0 — Foundation
* Monorepo, CI, lint/format, Vitest + Playwright skeletons.
* `apps/web` PWA shell with routing, theming, offline caching (service worker), install prompt.
* `packages/db` Drizzle schema + SQLite adapters (web OPFS, Capacitor, Tauri) with migrations.
* `packages/ydoc` Yjs persistence abstraction (IndexedDB + SQLite blob).
* Syllabus taxonomy pack (NCERT 6–12 + JEE + NEET + UPSC prelims) as versioned JSON.
* Capacitor Android build and Tauri desktop build both launch the shell.
* **DoD:** fresh clone → `pnpm dev` runs web; Android APK and desktop binary install and open; schema migrates on all three.

### M1 — Personal workspace (offline)
* Notes editor (TipTap + math + images + tags + backlinks + full-text search via FTS5).
* Flashcards with FSRS review, cloze cards, "make card from highlight".
* To-do planner (tasks, recurring, views) and scheduler (calendar, time blocks, pomodoro, rule-based study plan).
* Local import/export (Markdown, Anki `.apkg` import, JSON backup).
* **DoD:** airplane-mode test passes for all four features; a student can plan a week, take notes, make and review cards, with no account.

### M2 — Visual thinking
* Mind maps (React Flow, auto-layout, node ↔ note links, PNG export).
* Diagrams (Excalidraw embedded in notes and standalone).
* Slide decks (blocks → slides, present mode, PDF export).
* Animations v1 (keyframed states, play/scrub).
* **DoD:** all four work offline, persist as Yjs docs, and cross-link with notes/cards.

### M3 — Backend, accounts, sync, stock question bank
* `apps/api` (Hono), Postgres + Drizzle migrations, Better Auth with phone OTP + Google.
* Sync engine wired for all relational tables; Hocuspocus for Yjs docs; blob upload to R2.
* Conflict policy, device management, encrypted-at-rest backups, account deletion/export (DPDP compliance).
* Stock question bank pipeline: import tooling (`packages/content-tools`) → packs → offline download; practice sessions, timed mocks, analytics.
* **DoD:** two devices converge after offline edits on both; 10k-question pack practises fully offline; mock test mirrors a real exam's marking scheme.

### M4 — AI
* AI gateway with quotas and cost accounting; Gemini/OpenAI/Anthropic adapters; Ollama/WebLLM local adapter.
* Notebooks: source ingestion (PDF, note, URL, YouTube transcript, image), hybrid retrieval, cited chat, one-click artefacts.
* Doubt solver (camera → progressive solution → similar questions → save to mistake notebook).
* Personalised question generation + weak-topic detection + AI-generated flashcards/mind maps/slide outlines.
* **DoD:** a cited answer is traceable to the exact passage; doubt solver handles a photographed NCERT problem end-to-end; AI cost per active user is measured and within target.

### M5 — Social
* Realtime server (WebSocket), presence, offline outbox.
* Friends, DMs, group chats; share any artefact as a rich card.
* Channels with admins, scheduled posts, files; product-run "daily current affairs" channel.
* Communities with posts/comments/votes/flairs, reports, mod tools, automod keyword rules.
* Push notifications (FCM + Web Push).
* **DoD:** message sent offline is delivered on reconnect; a channel post with a PDF reaches 1k subscribers; a report → removal flow works end-to-end.

### M6 — Explore
* Career explorer (paths → exams → timelines) and college database (NIRF, courses, fees, cutoffs) with "predict my colleges".
* Data pipelines for yearly refresh; community links from each career/college page.
* **DoD:** a JEE rank returns a sensible college list; every career page links to at least one exam and community.

### M7 — Monetisation foundation
* Razorpay/Stripe subscriptions, Pro entitlements (AI quota, sync storage, mock analytics), receipts, grace periods.
* Usage dashboards for ops; abuse controls.
* **DoD:** a user can upgrade with UPI and immediately get Pro quotas; churn/revenue metrics are visible.

> Everything in [§9](#9-post-revenue-features) starts only after M7 has paying users.

---

## 9. Post-revenue features

| Feature | Approach | Key building blocks |
|---|---|---|
| **Live streams (study-focused YouTube)** | Do not build a video pipeline; use LiveKit (SFU) + object storage for VOD. Study-specific layer on top: timestamped doubts, in-stream polls/quizzes that write to the question bank, auto-generated notes from the transcript, "study with me" rooms with shared pomodoro. | LiveKit, transcript worker, notebook ingestion of recordings |
| **AI playground** | Model workbench (compare providers, system prompts, temperature), prompt library shared via communities, Manim/code sandbox for AI-generated explainer animations (Animations v2) rendered by `worker` into MP4. | AI gateway, sandboxed render worker, R2 |
| **Study automations (n8n-like)** | Visual trigger → condition → action builder (reusing React Flow). Triggers: new channel post, exam date approaching, weak topic detected, mock completed. Actions: create tasks, generate cards, summarise, notify, post to channel. Durable execution via BullMQ (upgrade to Temporal if needed). | React Flow, BullMQ, event bus from existing features |
| **Teacher pages (PW-like storefront)** | Teacher profile → batches (course + schedule) → content (recorded lectures, DPPs, notes, tests) → live classes (LiveKit) → payments with revenue share. Teachers get a channel and a community per batch automatically. Student side: enrolled batches appear as study plans and question packs. | Payments, LiveKit, channels/communities, question packs, scheduler |

---

## 10. Monetisation

* **Free:** full local-first workspace (notes, cards, planner, maps, diagrams, slides), stock
  question bank, communities/channels/chat, limited daily AI budget, limited sync storage.
* **Pro (monthly/yearly, UPI):** higher AI budget and stronger models, unlimited sync + backup,
  advanced mock analytics, personalised question bank, audio overviews, priority doubt solving.
* **BYO key:** bring your own provider key; AI quota removed, still pays for Pro features that
  aren't model cost.
* **Teacher marketplace (post-revenue):** platform take-rate on batch sales; optional subscription
  for storefront tools.
* **Never** sell student data; ads are out of scope.

---

## 11. Repository layout

```
studywise/
├── apps/
│   ├── web/              # React + Vite PWA (primary client)
│   ├── mobile/           # Capacitor shell (android/, ios/) wrapping apps/web build
│   ├── desktop/          # Tauri shell wrapping apps/web build
│   ├── api/              # Hono API: auth, sync, AI gateway, social, payments
│   ├── realtime/         # WebSocket server: chat, presence, Hocuspocus (Yjs)
│   └── worker/           # BullMQ jobs: ingestion, embeddings, generation, renders, schedules
├── packages/
│   ├── db/               # Drizzle schemas (sqlite + postgres dialects), migrations, adapters
│   ├── ydoc/             # Yjs document types (note, mindmap, diagram, deck) + persistence
│   ├── sync/             # Sync engine integration, outbox, conflict policies
│   ├── editor/           # TipTap extensions, block renderer, slide renderer
│   ├── canvas/           # Mind map + diagram + animation components
│   ├── srs/              # FSRS wrappers, review scheduling, Anki import
│   ├── practice/         # Question types, marking schemes, session engine, analytics
│   ├── ai/               # Model registry, prompts, retrieval, artefact generators, quotas
│   ├── ui/               # Design system (tokens, components, icons)
│   ├── shared/           # Types, validation (zod), utils, feature flags
│   └── content-tools/    # CLI: syllabus/question/college pack builders and validators
├── data/
│   ├── syllabus/         # Versioned taxonomy JSON per exam
│   ├── questions/        # Source → pack build inputs (licensed/public-domain only)
│   └── explore/          # Careers and colleges raw data + build scripts
├── docs/
│   ├── PLAN.md           # this file
│   └── adr/              # Architecture decision records (one per major decision)
└── infra/                # Docker Compose for local dev; deployment manifests
```

---

## 12. Risks & open decisions

| # | Risk / decision | Mitigation / how to decide |
|---|---|---|
| 1 | **Sync engine choice** (PowerSync vs ElectricSQL vs custom) | Spike both against the M1 schema at the start of M3: offline writes, partial sync by workspace, Capacitor support, licensing/cost at 100k users. Record as an ADR. |
| 2 | **DOM editors on low-end Android** | Benchmark TipTap/Excalidraw/React Flow in a Capacitor WebView on a ~₹10k phone during M0; set performance budgets; lazy-load editors. |
| 3 | **Question content licensing** | Use public-domain government PYQs and original/licensed content only; build a provenance field on every question; never scrape coaching material. |
| 4 | **AI cost per user** | Default to Flash-class models, aggressive caching, local models for offline, quotas on free tier, measured from M4 day one. |
| 5 | **Social moderation load** | Ship report/remove/ban + automod in M5, not later; communities start invite-only per exam; recruit volunteer mods. |
| 6 | **Data protection (India DPDP Act)** | Minors are a large share of users: parental consent flow, data export/deletion, encrypted backups, clear retention. Design in M3. |
| 7 | **Scope sprawl** | The feature list is wide; the milestone gates are strict. Nothing in §9 begins before M7 has paying users. |
| 8 | **Hindi / regional language** | UI i18n from M0; multilingual embeddings; Hinglish prompts tested in M4. |
| 9 | **Animations ambiguity** | v1 is deliberately small (keyframed states). Server-rendered Manim videos wait for the AI Playground. |
| 10 | **Platform choice regret** | Capacitor is reversible; keep all business logic in `packages/*` so a React Native shell could reuse it. |

---

## 13. Immediate next steps

1. Scaffold the monorepo (`apps/web`, `packages/db`, `packages/ydoc`, `packages/ui`, `packages/shared`) with CI.
2. Write ADR-001 (local-first architecture: SQLite + Yjs), ADR-002 (web-first + Capacitor/Tauri).
3. Build the M0 SQLite abstraction working on web (OPFS), Android (Capacitor), desktop (Tauri) with one Drizzle schema.
4. Encode the first syllabus pack (NCERT Class 11–12 Physics/Chemistry/Maths/Biology + JEE/NEET mapping).
5. Start M1 with Notes + Flashcards, the two features every segment uses daily.
