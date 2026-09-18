import { useEffect, useMemo, useRef, useState } from 'react'
import { AwardPopup } from '../components/AwardPopup'
import { HowToModal } from '../components/HowToModal'
import { LogoCard } from '../components/LogoCard'
import { ROUNDS, logoCards } from '../game/content'
import { LOGO_RECALL_POINTS, shuffle } from '../game/engine'
import type { AudienceMessage } from '../game/hostSync'
import type { Entity, Team } from '../game/types'
import './LogoRound.css'

interface Props {
  count: number
  onFinish: (known: number, total: number, missed: Entity[]) => void
  onQuit: () => void
  teams?: [Team, Team] | null
  onAdjust?: (index: 0 | 1, delta: number) => void
  sendAudience?: (msg: AudienceMessage) => void
}

export function LogoRound({ count, onFinish, onQuit, teams, onAdjust, sendAudience }: Props) {
  const cards = useMemo(() => shuffle(logoCards()).slice(0, count), [count])
  const meta = ROUNDS.find((r) => r.id === 'logos')!
  const [howTo, setHowTo] = useState(false)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [known, setKnown] = useState(0)
  // نقاط البطاقة الحالية، معلَّقة بانتظار قرار المستضيف من يستحقّها
  const [pendingAward, setPendingAward] = useState<number | null>(null)
  const missed = useRef<Entity[]>([])

  const entity = cards[index]
  const isLast = index + 1 >= cards.length
  const points = entity ? LOGO_RECALL_POINTS : 0

  function advance(gotIt: boolean) {
    if (gotIt) setKnown((k) => k + 1)
    else missed.current.push(entity)

    if (isLast) {
      onFinish(gotIt ? known + 1 : known, cards.length, missed.current)
      return
    }
    setIndex((i) => i + 1)
    setRevealed(false)
  }

  // في وضع الفريقين تتوقّف البطاقة عند نافذة توزيع النقاط قبل التقدّم؛
  // بلا فريقين تتقدّم كما كانت دوماً. الاسم يصل للجمهور هنا بالضبط —
  // لحظة حكم المستضيف، لا لحظة «اعرض الإجابة» الخاصّة به وحده.
  function judge(gotIt: boolean) {
    sendAudience?.({
      type: 'question',
      data: {
        roundTitle: meta.title, itemLabel: 'شعار', index, total: cards.length,
        prompt: 'لأي جهة هذا الشعار؟', image: entity.logo ?? entity.lockup, correctText: entity.nameAr,
      },
    })
    if (gotIt && teams) { setPendingAward(points); return }
    advance(gotIt)
  }

  // الاسم يصل للجمهور بعد الحكم لا عند «اعرض الإجابة» — تلك لحظة
  // تحقّق المستضيف الخاصّة، تماماً كمنطق الأغنية في SongPlay.
  useEffect(() => {
    if (!entity) return
    sendAudience?.({
      type: 'question',
      data: {
        roundTitle: meta.title,
        itemLabel: 'شعار',
        index,
        total: cards.length,
        prompt: 'لأي جهة هذا الشعار؟',
        image: entity.logo ?? entity.lockup,
      },
    })
  }, [sendAudience, entity, index, cards.length, meta.title])

  // المسافة تكشف، ثم ١ / ٢ للحكم على النفس
  const latest = useRef({ revealed, judge, onQuit })
  useEffect(() => {
    latest.current = { revealed, judge, onQuit }
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
      if (e.key === '1') cur.judge(true)
      if (e.key === '2') cur.judge(false)
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
            <button className="btn btn-yes" onClick={() => judge(true)}>عرفتها</button>
            <button className="btn btn-no" onClick={() => judge(false)}>ما عرفتها</button>
          </div>
        </>
      )}

      <button className="btn btn-quiet logoround-quit" onClick={onQuit}>إنهاء الجولة</button>

      {howTo && <HowToModal title={meta.title} steps={meta.howTo} onClose={() => setHowTo(false)} />}

      {pendingAward !== null && teams && (
        <AwardPopup
          points={pendingAward}
          teams={teams}
          onAward={(i) => { onAdjust?.(i, pendingAward); setPendingAward(null); advance(true) }}
          onSkip={() => { setPendingAward(null); advance(true) }}
        />
      )}
    </div>
  )
}
