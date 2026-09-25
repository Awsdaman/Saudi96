import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { FEEDBACK_MAX, FEEDBACK_MIN, sendFeedback } from '../game/analytics'
import type { FeedbackResult } from '../game/analytics'
import './HowToModal.css'
import './FeedbackModal.css'

interface Props {
  onClose: () => void
}

const ERROR_TEXT: Record<Exclude<FeedbackResult, 'ok'>, string> = {
  offline: 'الإرسال متاحٌ من موقع اللعبة على الإنترنت فقط، لا من ملفٍّ مفتوحٍ من الجهاز.',
  rate: 'أرسلت اقتراحاتٍ كثيرة خلال ساعة. شكراً لك! حاول مرّة أخرى لاحقاً.',
  invalid: 'اكتب اقتراحك أولاً (3 أحرفٍ على الأقل).',
  error: 'تعذّر الإرسال الآن. تحقّق من الاتصال وحاول مرّة أخرى.',
}

/** نافذة «اقتراح أو إضافة للعبة» — يكتب اللاعب رسالته فتصل إلى لوحة الإدارة */
export function FeedbackModal({ onClose }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.querySelector<HTMLElement>('textarea, button')?.focus()
    return () => previous?.focus()
  }, [])

  // بعد الإرسال يتغيّر المحتوى: ينتقل التركيز إلى زرّ الإغلاق
  useEffect(() => {
    if (sent) dialog.current?.querySelector('button')?.focus()
  }, [sent])

  const trimmed = text.trim()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (sending) return
    if (trimmed.length < FEEDBACK_MIN) {
      setError(ERROR_TEXT.invalid)
      return
    }
    setSending(true)
    setError(null)
    const result = await sendFeedback(trimmed)
    setSending(false)
    if (result === 'ok') setSent(true)
    else setError(ERROR_TEXT[result])
  }

  // يبقى التركيز داخل النافذة ما دامت مفتوحة
  function onKeyDown(e: KeyboardEvent) {
    e.stopPropagation()
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const items = [...(dialog.current?.querySelectorAll<HTMLElement>('textarea, button:not(:disabled)') ?? [])]
    if (!items.length) return
    const i = items.indexOf(document.activeElement as HTMLElement)
    const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 ? 0 : i + 1)
    e.preventDefault()
    items[next].focus()
  }

  return (
    <div className="howto-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialog}
        className="howto feedback"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onKeyDown={onKeyDown}
      >
        <h2 className="howto-title" id="feedback-title">اقتراح أو إضافة للعبة</h2>
        {sent ? (
          <>
            <p className="feedback-thanks" role="status">وصل اقتراحك، شكراً لك! نقرأ كل رسالة.</p>
            <button className="btn btn-primary" onClick={onClose}>إغلاق</button>
          </>
        ) : (
          <form className="feedback-form" onSubmit={submit}>
            <label className="feedback-label" htmlFor="feedback-text">
              سؤالٌ تقترحه، تصنيفٌ جديد، خطأٌ لاحظته، أو أي فكرةٍ تجعل اللعبة أجمل.
            </label>
            <textarea
              id="feedback-text"
              className="feedback-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                if (error) setError(null)
              }}
              maxLength={FEEDBACK_MAX}
              rows={5}
              placeholder="اكتب اقتراحك هنا…"
            />
            <span className="feedback-count" aria-live="polite">
              <span className="ltr">{text.length} / {FEEDBACK_MAX}</span>
            </span>
            {error && <p className="feedback-error" role="alert">{error}</p>}
            <p className="feedback-note">لا نطلب اسمك ولا بريدك، ولا يُحفظ مع الرسالة ما يدلّ عليك.</p>
            <div className="feedback-actions">
              <button className="btn btn-primary" type="submit" disabled={sending}>
                {sending ? 'جارٍ الإرسال…' : 'إرسال'}
              </button>
              <button className="btn btn-quiet" type="button" onClick={onClose}>إلغاء</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
