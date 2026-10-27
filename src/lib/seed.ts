import { db, type Deck, type Note, type Task } from './db'
import { newFlashcard } from './fsrs'
import { offsetDateKey, todayKey } from './dates'
import { stripHtml } from './utils'

const SEED_FLAG = 'studywise:seeded'

// Deterministic ids + bulkPut make seeding idempotent even if it runs twice
// (e.g. React StrictMode double-invoking the mount effect).
const ID = {
  welcomeNote: 'seed-note-welcome',
  kinematicsNote: 'seed-note-kinematics',
  deck: 'seed-deck-kinematics',
  card: (i: number) => `seed-card-kinematics-${i}`,
  task: (i: number) => `seed-task-${i}`,
}

let seeding: Promise<void> | null = null

/** Populate a brand-new workspace with a small example set so the app never feels empty. */
export function seedIfEmpty() {
  seeding ??= runSeed()
  return seeding
}

async function runSeed() {
  if (localStorage.getItem(SEED_FLAG)) return
  const count = await db.notes.count()
  if (count > 0) {
    localStorage.setItem(SEED_FLAG, '1')
    return
  }

  const now = Date.now()

  const welcomeHtml = `
<p>This is your <strong>local-first</strong> study workspace. Everything you create is stored on this device and works offline.</p>
<h2>Try these</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Select any text in a note and press <strong>Make flashcard</strong></p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Review the <em>Kinematics</em> deck — the scheduler adapts to how well you remember</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Start a 25-minute focus session from the Focus tab</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Press <code>Ctrl</code> + <code>K</code> to jump anywhere</p></div></li>
</ul>
<h2>Keyboard shortcuts</h2>
<ul>
  <li><code>Ctrl/⌘ + K</code> — command palette</li>
  <li><code>Ctrl/⌘ + B / I</code> — bold / italic</li>
  <li><code>1 2 3 4</code> — grade a flashcard while reviewing</li>
  <li><code>Space</code> — reveal a flashcard answer</li>
</ul>
<blockquote>Tip: the planner, flashcards and notes all understand subjects, so you can see where your time goes.</blockquote>`

  const kinematicsHtml = `
<p>Motion in one dimension with constant acceleration.</p>
<h2>Equations of motion</h2>
<ul>
  <li><code>v = u + at</code></li>
  <li><code>s = ut + ½at²</code></li>
  <li><code>v² = u² + 2as</code></li>
</ul>
<h2>Key ideas</h2>
<ul>
  <li>Velocity is the <mark>slope of the position–time graph</mark>.</li>
  <li>Acceleration is the slope of the velocity–time graph; displacement is the area under it.</li>
  <li>At the highest point of vertical projection, <mark>velocity is zero but acceleration is still g</mark>.</li>
</ul>
<h2>Common mistakes</h2>
<ol>
  <li>Mixing up distance (scalar) with displacement (vector).</li>
  <li>Forgetting the sign convention when an object changes direction.</li>
</ol>`

  const notes: Note[] = [
    {
      id: ID.welcomeNote,
      title: 'Welcome to StudyWise',
      content: welcomeHtml,
      plainText: stripHtml(welcomeHtml),
      subjectId: null,
      tags: ['getting-started'],
      pinned: true,
      createdAt: now - 1000,
      updatedAt: now - 1000,
    },
    {
      id: ID.kinematicsNote,
      title: 'Kinematics — quick revision',
      content: kinematicsHtml,
      plainText: stripHtml(kinematicsHtml),
      subjectId: 'physics',
      tags: ['revision', 'class-11'],
      pinned: false,
      createdAt: now - 86400000,
      updatedAt: now - 3600000,
    },
  ]

  const deck: Deck = {
    id: ID.deck,
    title: 'Kinematics',
    description: 'Equations of motion and graph interpretation',
    subjectId: 'physics',
    createdAt: now,
    updatedAt: now,
  }

  const cards = [
    ['First equation of motion?', 'v = u + at'],
    ['Second equation of motion?', 's = ut + ½at²'],
    ['Third equation of motion?', 'v² = u² + 2as'],
    ['Slope of a position–time graph gives…', 'Velocity'],
    ['Area under a velocity–time graph gives…', 'Displacement'],
    [
      'Velocity and acceleration at the top of a vertical throw?',
      'Velocity = 0, acceleration = g (downwards)',
    ],
  ].map(([front, back], i) => ({
    ...newFlashcard({ deckId: deck.id, front, back, sourceNoteId: notes[1].id }),
    id: ID.card(i),
  }))

  const tasks: Task[] = [
    {
      id: ID.task(1),
      title: 'Review Kinematics flashcards',
      notes: '',
      dueDate: todayKey(),
      priority: 'high',
      status: 'todo',
      subjectId: 'physics',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ID.task(2),
      title: 'Solve 10 practice questions',
      notes: 'Use the Practice tab. Aim for 80% accuracy.',
      dueDate: todayKey(),
      priority: 'medium',
      status: 'todo',
      subjectId: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ID.task(3),
      title: 'Make notes on Chemical Bonding',
      notes: '',
      dueDate: offsetDateKey(1),
      priority: 'medium',
      status: 'todo',
      subjectId: 'chemistry',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ID.task(4),
      title: 'Plan next week’s timetable',
      notes: '',
      dueDate: offsetDateKey(3),
      priority: 'low',
      status: 'todo',
      subjectId: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ]

  await db.transaction('rw', db.notes, db.decks, db.cards, db.tasks, async () => {
    await db.notes.bulkPut(notes)
    await db.decks.put(deck)
    await db.cards.bulkPut(cards)
    await db.tasks.bulkPut(tasks)
  })
  localStorage.setItem(SEED_FLAG, '1')
}
