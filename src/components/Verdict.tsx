import './Verdict.css'

interface Props {
  show: boolean
  correct: boolean
  /** نفد الوقت دون إجابة */
  timedOut: boolean
  /** نصّ الإجابة الصحيحة */
  answer: string
  points: number
  explanation?: string
  /** آخر سؤال في الجولة */
  last: boolean
  onNext: () => void
}

/**
 * الحكم على الإجابة.
 *
 * على الجهاز: بطاقة تحت الخيارات، كما كانت.
 * على المسرح: استيلاء على الشاشة كلها — الغرفة على بُعد أمتار لا تُلاحق
 * لوحاً يظهر أسفل الطيّة ويزحزح ما فوقه.
 *
 * التوقيت كلّه في CSS لا في JS: «الوقفة» و«الصعود» و«ظهور المعلومة»
 * تأخيراتٌ في animation-delay. جُرِّبت المكتبة أولاً فكان تأخير الدخول
 * يتسرّب إلى الخروج، فيبقى اللوح شبحاً فوق السؤال التالي — عدا أنها
 * تُكلّف مئة وسبعة وعشرين كيلوبايت في حزمة تُفتح من القرص.
 */
export function Verdict({
  show, correct, timedOut, answer, points, explanation, last, onNext,
}: Props) {
  if (!show) return null

  return (
    <div
      className={`verdict ${correct ? 'is-correct' : 'is-wrong'}`}
      /* الغرفة تقرأ الحكم بصرياً، وقارئ الشاشة يسمعه من هنا */
      role="status"
      aria-live="polite"
    >
      <strong className="verdict-word">
        {correct ? 'إجابة صحيحة' : timedOut ? 'نفد الوقت' : 'إجابة خاطئة'}
      </strong>

      <p className="verdict-answer">{answer}</p>

      {points > 0 && (
        <span className="verdict-points">
          <span className="ltr">+{points.toLocaleString('en-US')}</span>
        </span>
      )}

      {explanation && (
        // بعد الحكم بقليل: تُقرأ الإجابة أولاً ثم المعلومة.
        // وهذه هي اللحظة التي يتحدّث فيها المقدّم، فلا تُزاحمها حركة.
        <p className="verdict-text">{explanation}</p>
      )}

      {/* بلا autoFocus: لو كان الزر مركَّزاً لأطلق Enter الحدثين معاً —
          المستمع والنقر — فتُتخطّى نتيجة */}
      <button className="btn btn-primary verdict-next" onClick={onNext}>
        {last ? 'النتيجة' : 'التالي'}
      </button>
    </div>
  )
}
