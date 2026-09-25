import { buildRound, buildMixedRound, scoreAnswer, scoreSong } from './engine.ts'
import type { GameRoundId, Question, SongPhase } from './types'

export interface AnswerRecord {
  question: Question
  selected: number | null
  correct: boolean
  points: number
  songPhase?: SongPhase
  unavailable?: boolean
  /** أُظهرت الخيارات على الشاشة قبل الاختيار — تُنصّف النقاط عقوبةً على المخاطرة المتجنَّبة */
  discounted?: boolean
  /** كشفها المستضيف بنفسه («اعرض لي الإجابة» بشاشةٍ واحدة) — لا إجابةَ من اللاعبين تُحتسب في دقّة الأسئلة */
  revealed?: boolean
}

export interface GameState {
  phase: 'home' | 'playing' | 'results'
  roundId: GameRoundId | null
  title: string
  questions: Question[]
  index: number
  selected: number | null
  resolved: boolean
  songPhase: SongPhase
  songRevealed: boolean
  songHeard: boolean
  score: number
  streak: number
  bestStreak: number
  records: AnswerRecord[]
}

export const initialState: GameState = {
  phase: 'home', roundId: null, title: '', questions: [], index: 0,
  selected: null, resolved: false, songPhase: 1, songRevealed: false, songHeard: false,
  score: 0, streak: 0, bestStreak: 0, records: [],
}

export type Action =
  | { type: 'start'; roundId: GameRoundId; title: string; pool: readonly Question[]; count: number }
  /** choice = -1: حكم المستضيف بإجابةٍ شفهية خاطئة — بلا خيارٍ مختار على الشاشة */
  | { type: 'answer'; questionId: string; choice: number; discounted?: boolean; revealed?: boolean }
  | { type: 'song-heard' | 'song-clue' | 'song-reveal'; questionId: string; songPhase: SongPhase }
  | { type: 'song-judge'; questionId: string; correct: boolean }
  | { type: 'song-unavailable'; questionId: string }
  | { type: 'next'; questionId: string }
  | { type: 'home' }

function finish(state: GameState, correct: boolean, selected: number | null, unavailable = false, discounted = false, revealed = false): GameState {
  const question = state.questions[state.index]
  const points = correct
    ? question.kind === 'song' ? scoreSong(state.songPhase) : scoreAnswer(discounted)
    : 0
  const streak = unavailable ? state.streak : correct ? state.streak + 1 : 0
  return {
    ...state, selected, resolved: true, songRevealed: question.kind === 'song',
    score: state.score + points, streak, bestStreak: Math.max(state.bestStreak, streak),
    records: [...state.records, {
      question, selected, correct, points,
      ...(question.kind === 'song' ? { songPhase: state.songPhase } : {}),
      ...(unavailable ? { unavailable: true } : {}),
      ...(discounted && correct ? { discounted: true } : {}),
      ...(revealed ? { revealed: true } : {}),
    }],
  }
}

export function gameReducer(state: GameState, action: Action): GameState {
  if (action.type === 'home') return initialState
  if (action.type === 'start') {
    const questions = (action.roundId === 'custom' ? buildMixedRound : buildRound)(action.pool, Math.max(0, Math.trunc(action.count)))
    return { ...initialState, questions, phase: questions.length ? 'playing' : 'results', roundId: action.roundId, title: action.title }
  }
  const question = state.questions[state.index]
  // المعرّف يحمي السؤال التالي من النقرات المتكررة والأحداث المتأخرة.
  if (state.phase !== 'playing' || !question || question.id !== action.questionId) return state
  if (action.type === 'next') {
    if (!state.resolved) return state
    const index = state.index + 1
    return index >= state.questions.length ? { ...state, phase: 'results' }
      : { ...state, index, selected: null, resolved: false, songPhase: 1, songRevealed: false, songHeard: false }
  }
  if (state.resolved) return state
  if (action.type === 'answer') {
    if (question.kind === 'song' || !Number.isInteger(action.choice) || action.choice < -1 || action.choice >= question.options.length) return state
    return finish(state, action.choice === question.answerIndex, action.choice, false, action.discounted, action.revealed)
  }
  if (question.kind !== 'song') return state
  if ('songPhase' in action && action.songPhase !== state.songPhase) return state
  switch (action.type) {
    case 'song-heard': return state.songRevealed ? state : { ...state, songHeard: true }
    case 'song-reveal': return !state.songHeard ? state : { ...state, songRevealed: true }
    case 'song-clue':
      if (!state.songHeard || state.songRevealed) return state
      return state.songPhase === 3 ? finish(state, false, null)
        : { ...state, songPhase: (state.songPhase + 1) as SongPhase, songHeard: false }
    case 'song-judge': return state.songRevealed ? finish(state, action.correct, null) : state
    case 'song-unavailable': return state.songRevealed ? state : finish(state, false, null, true)
    default: return state
  }
}
