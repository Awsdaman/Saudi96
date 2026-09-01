import { useMemo, useState } from 'react'
import { poolSources, poolFromSources } from '../game/content'
import type { Question } from '../game/types'
import './CustomBuilder.css'

interface Props {
  onStart: (pool: Question[], count: number) => void
  onBack: () => void
}

const LENGTHS = [10, 15, 20, 30]

export function CustomBuilder({ onStart, onBack }: Props) {
  const sources = useMemo(() => poolSources(), [])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [length, setLength] = useState(15)

  const available = useMemo(() => poolFromSources([...picked]).length, [picked])
  const groups = ['جولات', 'فئات الشخصيات', 'تصنيفات معرفية'] as const

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setPicked(new Set(sources.map((s) => s.id)))
  }

  // لا يمكن طلب أسئلة أكثر مما توفّره المصادر المختارة
  const realLength = Math.min(length, available)
  const canStart = available > 0

  return (
    <div className="builder">
      <header className="builder-head">
        <h1 className="builder-title">لعبتي</h1>
        <p className="builder-sub">اختر ما تبغى، ونمزجها لك في جولة واحدة</p>
      </header>

      {groups.map((g) => (
        <section key={g} className="builder-group">
          <h2 className="builder-group-title">{g}</h2>
          <div className="chips">
            {sources.filter((s) => s.group === g).map((s) => (
              <button
                key={s.id}
                className={`chip-pick ${picked.has(s.id) ? 'is-on' : ''}`}
                onClick={() => toggle(s.id)}
                aria-pressed={picked.has(s.id)}
                disabled={s.count === 0}
              >
                <span>{s.label}</span>
                <span className="chip-count ltr">{s.count}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="builder-group">
        <h2 className="builder-group-title">عدد الأسئلة</h2>
        <div className="chips">
          {LENGTHS.map((n) => (
            <button
              key={n}
              className={`chip-pick ${length === n ? 'is-on' : ''}`}
              onClick={() => setLength(n)}
              aria-pressed={length === n}
            >
              <span className="ltr">{n}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="builder-foot">
        <p className="builder-status">
          {available === 0 ? (
            'اختر مصدراً واحداً على الأقل'
          ) : (
            <>
              متاح <span className="ltr">{available}</span> سؤال · ستلعب{' '}
              <span className="ltr">{realLength}</span>
            </>
          )}
        </p>
        <div className="builder-actions">
          <button
            className="btn btn-primary"
            disabled={!canStart}
            onClick={() => onStart(poolFromSources([...picked]), realLength)}
          >
            ابدأ
          </button>
          <button className="btn btn-quiet" onClick={selectAll}>اختر الكل</button>
          <button className="btn btn-quiet" onClick={onBack}>رجوع</button>
        </div>
      </footer>
    </div>
  )
}
