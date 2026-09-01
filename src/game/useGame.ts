import { useCallback, useEffect, useReducer, useRef } from 'react'
import { buildRound, revealProgress, scoreAnswer } from './engine'
import type { Question, RoundId } from './types'

const TICK_MS = 100

export interface AnswerRecord {
  question: Question
  /** -1 يعني نفاد الوقت دون إجابة */
  selected: number
  correct: boolean
  points: number
}

export interface GameState {
  phase: 'home' | 'playing' | 'results'
  roundId: RoundId | null
  questions: Question[]
  index: number
  selected: number | null
  score: number
  streak: number
  bestStreak: number
  timeLeft: number
  totalTime: number
  records: AnswerRecord[]
}

const initial: GameState = {
  phase: 'home',
  roundId: null,
  questions: [],
  index: 0,
  selected: null,
  score: 0,
  streak: 0,
  bestStreak: 0,
  timeLeft: 0,
  totalTime: 0,
  records: [],
}

type Action =
  | { type: 'start'; roundId: RoundId; pool: readonly Question[]; count: number; seconds: number }
  | { type: 'tick'; delta: number }
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
        questions,
        timeLeft: action.seconds,
        totalTime: action.seconds,
      }
    }

    case 'tick': {
      // المؤقّت يعمل فقط أثناء انتظار الإجابة
      if (state.phase !== 'playing' || state.selected !== null) return state
      const timeLeft = state.timeLeft - action.delta
      if (timeLeft > 0) return { ...state, timeLeft }
      // نفاد الوقت = إجابة خاطئة تكسر السلسلة
      return {
        ...state,
        timeLeft: 0,
        selected: -1,
        streak: 0,
        records: [
          ...state.records,
          { question: state.questions[state.index], selected: -1, correct: false, points: 0 },
        ],
      }
    }

    case 'answer': {
      if (state.phase !== 'playing' || state.selected !== null) return state
      const question = state.questions[state.index]
      const correct = action.choice === question.answerIndex
      const points = correct
        ? scoreAnswer(question.difficulty, state.timeLeft, state.totalTime, state.streak)
        : 0
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
      return { ...state, index, selected: null, timeLeft: state.totalTime }
    }

    case 'home':
      return initial

    default:
      return state
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, initial)

  // مؤقّت واحد يعمل طوال الجولة؛ الـ reducer يتجاهل النبضات وقت التوقّف
  const running = state.phase === 'playing' && state.selected === null
  const lastRef = useRef(0)

  useEffect(() => {
    if (!running) return
    lastRef.current = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const delta = (now - lastRef.current) / 1000
      lastRef.current = now
      dispatch({ type: 'tick', delta })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [running])

  const start = useCallback(
    (roundId: RoundId, pool: readonly Question[], count: number, seconds: number) =>
      dispatch({ type: 'start', roundId, pool, count, seconds }),
    [],
  )
  const answer = useCallback((choice: number) => dispatch({ type: 'answer', choice }), [])
  const next = useCallback(() => dispatch({ type: 'next' }), [])
  const home = useCallback(() => dispatch({ type: 'home' }), [])

  const question = state.questions[state.index] as Question | undefined
  const reveal = revealProgress(state.timeLeft, state.totalTime)

  return { state, question, reveal, start, answer, next, home }
}
