import { useCallback, useReducer } from 'react'
import { gameReducer, initialState } from './gameReducer'
import type { GameRoundId, Question, SongPhase } from './types'
export type { GameState, AnswerRecord } from './gameReducer'

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const question = state.questions[state.index] as Question | undefined
  const questionId = question?.id ?? ''
  const start = useCallback((roundId: GameRoundId, title: string, pool: readonly Question[], count: number) =>
    dispatch({ type: 'start', roundId, title, pool, count }), [])
  const answer = useCallback((choice: number, discounted?: boolean) => dispatch({ type: 'answer', questionId, choice, discounted }), [questionId])
  const next = useCallback(() => dispatch({ type: 'next', questionId }), [questionId])
  const home = useCallback(() => dispatch({ type: 'home' }), [])
  const songAction = useCallback((type: 'song-clue' | 'song-reveal' | 'song-heard', songPhase: SongPhase) =>
    dispatch({ type, questionId, songPhase }), [questionId])
  const judgeSong = useCallback((correct: boolean) => dispatch({ type: 'song-judge', questionId, correct }), [questionId])
  const skipUnavailable = useCallback(() => dispatch({ type: 'song-unavailable', questionId }), [questionId])
  return { state, question, start, answer, next, home, songAction, judgeSong, skipUnavailable }
}
