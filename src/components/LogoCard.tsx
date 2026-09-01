import type { Entity } from '../game/types'
import './LogoCard.css'

interface Props {
  entity: Entity
  /** قبل الكشف: الرمز وحده · بعده: الشعار الكامل بالاسم */
  revealed: boolean
}

export function LogoCard({ entity, revealed }: Props) {
  // الرموز مقصوصة مسبقاً إلى ملفات مستقلة (scripts/make-symbols.mjs)،
  // فلا حاجة لقصّ وقت العرض. الشعارات النصية بلا رمز منفصل فتُعرض كاملةً.
  const src = revealed ? entity.lockup! : (entity.logo ?? entity.lockup!)

  return (
    <div className="logocard">
      <div className="logocard-frame">
        <img className="logocard-img" src={src} alt="" />
      </div>
    </div>
  )
}
