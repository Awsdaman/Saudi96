import { useEffect, useRef } from 'react'
import './HowToModal.css'

interface Props {
  title: string
  steps: string[]
  onClose: () => void
}

/** نافذة «كيف تلعب» داخل الجولة — تُفتح من زر ؟ */
export function HowToModal({ title, steps, onClose }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.querySelector('button')?.focus()
    return () => previous?.focus()
  }, [])
  return (
    <div className="howto-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialog}
        className="howto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`كيف تلعب ${title}`}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') { e.preventDefault(); onClose() }
          if (e.key === 'Tab') { e.preventDefault(); dialog.current?.querySelector('button')?.focus() }
        }}
      >
        <h2 className="howto-title">كيف تلعب</h2>
        <ol className="howto-steps">
          {steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <button className="btn btn-primary" onClick={onClose}>فهمت</button>
      </div>
    </div>
  )
}
