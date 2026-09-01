import './HowToModal.css'

interface Props {
  title: string
  steps: string[]
  onClose: () => void
}

/** نافذة «كيف تلعب» داخل الجولة — تُفتح من زر ؟ */
export function HowToModal({ title, steps, onClose }: Props) {
  return (
    <div className="howto-backdrop" onClick={onClose} role="presentation">
      <div
        className="howto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`كيف تلعب ${title}`}
      >
        <h2 className="howto-title">كيف تلعب</h2>
        <ol className="howto-steps">
          {steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <button className="btn btn-primary" onClick={onClose} autoFocus>فهمت</button>
      </div>
    </div>
  )
}
