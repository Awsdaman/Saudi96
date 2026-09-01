import './AnswerGrid.css'

interface Props {
  options: string[]
  answerIndex: number
  /** null = لم يُجب بعد · -1 = نفد الوقت */
  selected: number | null
  onPick: (i: number) => void
}

export function AnswerGrid({ options, answerIndex, selected, onPick }: Props) {
  const done = selected !== null

  return (
    <div className="answers">
      {options.map((opt, i) => {
        let state = ''
        if (done) {
          if (i === answerIndex) state = 'is-correct'
          else if (i === selected) state = 'is-wrong'
          else state = 'is-muted'
        }
        const marked = state === 'is-correct' || state === 'is-wrong'

        return (
          <button
            key={opt}
            className={`answer ${state} ${i === selected ? 'is-picked' : ''}`}
            onClick={() => onPick(i)}
            disabled={done}
          >
            <span className="answer-key">{i + 1}</span>
            <span className="answer-text">{opt}</span>
            {/* لا يُعرَّف حالٌ باللون وحده — والعلامة تُقرأ من آخر الغرفة
                حيث لا يكاد يُميَّز حدٌّ أخضر من حدٍّ أحمر */}
            {marked && (
              <span className="answer-mark" aria-hidden="true">
                {state === 'is-correct' ? '✓' : '✕'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
