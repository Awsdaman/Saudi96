import { useCallback, useReducer } from 'react'
import { buildRound, scoreAnswer } from './engine'
import type { Question, RoundId } from './types'

export interface AnswerRecord {
  question: Question
  selected: number
  correct: boolean
  points: number
}

export interface GameState {
  phase: 'home' | 'playing' | 'results'
  roundId: RoundId | null
  /**
   * عنوان الجولة كما يُعرض. لا يُشتقّ من roundId: جولة «لعبتي» تستعير
   * معرّف الأسئلة المعرفية وعاءً لها، فاشتقاقُ العنوان منه يسمّيها
   * «أسئلة معرفية» على الشاشة وعلى شاشة المقدّم معاً.
   */
  title: string
  questions: Question[]
  index: number
  selected: number | null
  score: number
  streak: number
  bestStreak: number
  records: AnswerRecord[]
}

const initial: GameState = {
  phase: 'home',
  roundId: null,
  title: '',
  questions: [],
  index: 0,
  selected: null,
  score: 0,
  streak: 0,
  bestStreak: 0,
  records: [],
}

type Action =
  | { type: 'start'; roundId: RoundId; title: string; pool: readonly Question[]; count: number }
  | { type: 'answer'; choice: number }
  | { type: 'next' }
  | { type: 'home' }

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'start': {
      const questions = buildRound(action.pool, action.count)
      return {
        ...initial,
        phase: questions.length ? 'playing' : 'results',
        roundId: action.roundId,
        title: action.title,
        questions,
      }
    }

    case 'answer': {
      if (state.phase !== 'playing' || state.selected !== null) return state
      const question = state.questions[state.index]
      const correct = action.choice === question.answerIndex
      const points = correct ? scoreAnswer(question.difficulty, state.streak) : 0
      const streak = correct ? state.streak + 1 : 0
      return {
        ...state,
        selected: action.choice,
        score: state.score + points,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        records: [...state.records, { question, selected: action.choice, correct, points }],
      }
    }

    case 'next': {
      const index = state.index + 1
      if (index >= state.questions.length) return { ...state, phase: 'results' }
      return { ...state, index, selected: null }
    }

    case 'home':
      return initial

    default:
      return state
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, initial)

  const start = useCallback(
    (roundId: RoundId, title: string, pool: readonly Question[], count: number) =>
      dispatch({ type: 'start', roundId, title, pool, count }),
    [],
  )
  const answer = useCallback((choice: number) => dispatch({ type: 'answer', choice }), [])
  const next = useCallback(() => dispatch({ type: 'next' }), [])
  const home = useCallback(() => dispatch({ type: 'home' }), [])

  const question = state.questions[state.index] as Question | undefined

  return { state, question, start, answer, next, home }
}
