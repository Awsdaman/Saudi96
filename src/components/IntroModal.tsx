import { useEffect, useRef } from 'react'
import './IntroModal.css'

interface Category {
  title: string
  subtitle: string
}

interface Props {
  categories: Category[]
  onClose: () => void
}

/** نافذة الترحيب — تعريف باللعبة وتصنيفاتها، تظهر عند فتح الموقع */
export function IntroModal({ categories, onClose }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.querySelector('button')?.focus()
    return () => previous?.focus()
  }, [])
  return (
    <div className="intro-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialog}
        className="intro"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="عن اللعبة"
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') { e.preventDefault(); onClose() }
        }}
      >
        <h2 className="intro-title">هل تعرف السعودية؟</h2>
        <p className="intro-lede">
          جولة أسئلة خفيفة عن المملكة وثقافتها، تُلعَب على شاشةٍ واحدة أمام الجميع —
          اختر تصنيفاً، حدّد عدد الأسئلة، وابدأ. هذه التصنيفات المتاحة:
        </p>
        <ul className="intro-categories">
          {categories.map((c) => (
            <li key={c.title}>
              <span className="intro-cat-title">{c.title}</span>
              <span className="intro-cat-sub">{c.subtitle}</span>
            </li>
          ))}
        </ul>
        <button className="btn btn-primary" onClick={onClose}>لنبدأ</button>
      </div>
    </div>
  )
}
