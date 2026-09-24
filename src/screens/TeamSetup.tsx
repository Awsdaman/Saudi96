import { useState } from 'react'
import './TeamSetup.css'

interface Props {
  onStart: (nameA: string, nameB: string, withAudience: boolean) => void
  onSkip: () => void
}

const DEFAULT_A = 'الفريق الأول'
const DEFAULT_B = 'الفريق الثاني'

/** شاشة افتتاحية: تسمية فريقين قبل الدخول إلى القائمة الرئيسية،
 *  فيتنافسان بنقاطٍ منفصلة عن نقاط الجولة نفسها طوال الجلسة. */
export function TeamSetup({ onStart, onSkip }: Props) {
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  // تبويب جمهورٍ منفصل — الإجابة تبقى عند المستضيف حتى يُفصح عنها.
  // انظر التعليق في hostSync.ts وAudienceView.tsx.
  const [withAudience, setWithAudience] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onStart(nameA.trim() || DEFAULT_A, nameB.trim() || DEFAULT_B, withAudience)
  }

  return (
    <div className="teamsetup">
      <form className="teamsetup-card" onSubmit={submit}>
        <h1 className="teamsetup-title">هل تعرف السعودية؟</h1>
        <p className="teamsetup-lede">قسّم اللاعبين فريقين، وتابع نقاطهما طوال الجلسة — من يجيب صحيحاً أولاً يأخذ نقطة فريقه.</p>

        <div className="teamsetup-teams">
          <label className="teamsetup-team teamsetup-team-a">
            <span className="teamsetup-team-label">الفريق الأول</span>
            <input
              className="teamsetup-input"
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder={DEFAULT_A}
              maxLength={40}
            />
          </label>
          <label className="teamsetup-team teamsetup-team-b">
            <span className="teamsetup-team-label">الفريق الثاني</span>
            <input
              className="teamsetup-input"
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder={DEFAULT_B}
              maxLength={40}
            />
          </label>
        </div>

        <label className="teamsetup-audience">
          <input
            type="checkbox"
            checked={withAudience}
            onChange={(e) => setWithAudience(e.target.checked)}
          />
          <span>
            افتح شاشة عرضٍ للجمهور
            <small>الإجابة تبقى عندك حتى تُعلنها؛ افتحها على شاشة العرض واستضف من هذا الجهاز</small>
          </span>
        </label>

        <button className="btn btn-primary teamsetup-start" type="submit">ابدأ</button>
        <button className="btn-link teamsetup-skip" type="button" onClick={onSkip}>لعب بلا فرق</button>
      </form>

      <p className="teamsetup-credits">
        <span>الفكرة والتنفيذ: أوس دمنهوري</span>
        <span>التصميم: أحمد خياط</span>
        <span>التدقيق والمراجعة: عمرو الحربي</span>
      </p>
    </div>
  )
}
