export interface Exam {
  id: string
  name: string
  shortName: string
  subjectIds: string[]
  /** Marks for a correct / wrong answer in a typical MCQ section. */
  marking: { correct: number; wrong: number }
}

export interface Subject {
  id: string
  name: string
  /** Tailwind color token used for chips and accents. */
  color: 'indigo' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'teal' | 'orange'
}

export const SUBJECTS: Subject[] = [
  { id: 'physics', name: 'Physics', color: 'sky' },
  { id: 'chemistry', name: 'Chemistry', color: 'amber' },
  { id: 'maths', name: 'Mathematics', color: 'indigo' },
  { id: 'biology', name: 'Biology', color: 'emerald' },
  { id: 'english', name: 'English', color: 'rose' },
  { id: 'history', name: 'History', color: 'orange' },
  { id: 'polity', name: 'Polity', color: 'violet' },
  { id: 'geography', name: 'Geography', color: 'teal' },
  { id: 'economics', name: 'Economics', color: 'amber' },
  { id: 'reasoning', name: 'Reasoning', color: 'violet' },
  { id: 'quant', name: 'Quantitative Aptitude', color: 'indigo' },
  { id: 'general', name: 'General', color: 'teal' },
]

export const EXAMS: Exam[] = [
  {
    id: 'cbse-10',
    name: 'CBSE Class 10',
    shortName: 'Class 10',
    subjectIds: ['maths', 'physics', 'chemistry', 'biology', 'english', 'history', 'geography'],
    marking: { correct: 1, wrong: 0 },
  },
  {
    id: 'cbse-12',
    name: 'CBSE Class 12',
    shortName: 'Class 12',
    subjectIds: ['maths', 'physics', 'chemistry', 'biology', 'english', 'economics'],
    marking: { correct: 1, wrong: 0 },
  },
  {
    id: 'jee',
    name: 'JEE Main / Advanced',
    shortName: 'JEE',
    subjectIds: ['physics', 'chemistry', 'maths'],
    marking: { correct: 4, wrong: -1 },
  },
  {
    id: 'neet',
    name: 'NEET UG',
    shortName: 'NEET',
    subjectIds: ['physics', 'chemistry', 'biology'],
    marking: { correct: 4, wrong: -1 },
  },
  {
    id: 'upsc',
    name: 'UPSC Civil Services (Prelims)',
    shortName: 'UPSC',
    subjectIds: ['history', 'polity', 'geography', 'economics', 'general'],
    marking: { correct: 2, wrong: -0.66 },
  },
  {
    id: 'ssc',
    name: 'SSC CGL',
    shortName: 'SSC',
    subjectIds: ['quant', 'reasoning', 'english', 'general'],
    marking: { correct: 2, wrong: -0.5 },
  },
  {
    id: 'cat',
    name: 'CAT',
    shortName: 'CAT',
    subjectIds: ['quant', 'reasoning', 'english'],
    marking: { correct: 3, wrong: -1 },
  },
]

export const subjectById = Object.fromEntries(SUBJECTS.map((s) => [s.id, s])) as Record<
  string,
  Subject
>
export const examById = Object.fromEntries(EXAMS.map((e) => [e.id, e])) as Record<string, Exam>

export const SUBJECT_COLOR_CLASSES: Record<Subject['color'], string> = {
  indigo: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-500/30',
  sky: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
  amber: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 ring-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-violet-500/30',
  teal: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30',
  orange: 'bg-orange-500/15 text-orange-800 dark:text-orange-300 ring-orange-500/30',
}

export const SUBJECT_DOT_CLASSES: Record<Subject['color'], string> = {
  indigo: 'bg-indigo-500',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  orange: 'bg-orange-500',
}
