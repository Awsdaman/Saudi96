import { useEffect, useMemo, useRef, useState } from 'react'
import { HowToModal } from '../components/HowToModal'
import { LogoCard } from '../components/LogoCard'
import { ROUNDS, logoCards } from '../game/content'
import { shuffle } from '../game/engine'
import type { PresenterState } from '../game/presenter'
import type { Entity } from '../game/types'
import './LogoRound.css'

interface Props {
  count: number
  onCard: (s: PresenterState) => void
  onFinish: (known: number, total: number, missed: Entity[]) => void
  onQuit: () => void
}

export function LogoRound({ count, onCard, onFinish, onQuit }: Props) {
  const cards = useMemo(() => shuffle(logoCards()).slice(0, count), [count])
  const meta = ROUNDS.find((r) => r.id === 'logos')!
  const [howTo, setHowTo] = useState(false)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [known, setKnown] = useState(0)
  const missed = useRef<Entity[]>([])

  const entity = cards[index]
  const isLast = index + 1 >= cards.length

  // شاشة المقدّم ترى اسم الجهة دائماً، حتى قبل أن يكشفه اللاعب
  useEffect(() => {
    if (!entity) return
    onCard({
      kind: 'logo',
      roundTitle: meta.title,
      index,
      total: cards.length,
      prompt: 'لأي جهة هذا الشعار؟',
      answer: entity.nameAr,
      image: entity.lockup,
      revealed,
      score: known,
    })
  }, [entity, index, revealed, known, cards.length, meta.title, onCard])

  function next(gotIt: boolean) {
    if (gotIt) setKnown((k) => k + 1)
    else missed.current.push(entity)

    if (isLast) {
      onFinish(gotIt ? known + 1 : known, cards.length, missed.current)
      return
    }
    setIndex((i) => i + 1)
    setRevealed(false)
  }

  // المسافة تكشف، ثم ١ / ٢ للحكم على النفس
  const latest = useRef({ revealed, next, onQuit })
  useEffect(() => {
    latest.current = { revealed, next, onQuit }
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cur = latest.current
      if (e.key === 'Escape') return cur.onQuit()
      if (!cur.revealed) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          setRevealed(true)
        }
        return
      }
      if (e.key === '1') cur.next(true)
      if (e.key === '2') cur.next(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!entity) return null

  return (
    <div className="logoround">
      <div className="logoround-bar">
        <span className="chip">
          <span className="ltr">{index + 1}</span> من <span className="ltr">{cards.length}</span>
        </span>
        <button className="chip chip-help" onClick={() => setHowTo(true)} aria-label="كيف تلعب">؟</button>
        <span className="chip chip-score">
          عرفت <span className="ltr">{known}</span>
        </span>
      </div>

      <LogoCard entity={entity} revealed={revealed} />

      {!revealed ? (
        <>
          <h2 className="logoround-q">لأي جهة هذا الشعار؟</h2>
          <button className="btn btn-primary logoround-reveal" onClick={() => setRevealed(true)}>
            اعرض الإجابة
          </button>
        </>
      ) : (
        <>
          <h2 className="logoround-answer">{entity.nameAr}</h2>
          <div className="logoround-judge">
            <button className="btn btn-yes" onClick={() => next(true)}>عرفتها</button>
            <button className="btn btn-no" onClick={() => next(false)}>ما عرفتها</button>
          </div>
        </>
      )}

      <button className="btn btn-quiet logoround-quit" onClick={onQuit}>إنهاء الجولة</button>

      {howTo && <HowToModal title={meta.title} steps={meta.howTo} onClose={() => setHowTo(false)} />}
    </div>
  )
}
