import { useMemo } from 'react'
import creditsRaw from '../data/credits.json'
import './Credits.css'

interface Credit {
  file: string
  nameAr: string
  wikiFile?: string
  license?: string | null
  licenseUrl?: string | null
  author?: string | null
  page?: string | null
  hostedOn?: string | null
  nonFreeLocal?: boolean
}

const credits = creditsRaw as Credit[]

/** رخصةٌ تشترط نسبة العمل إلى صاحبه */
const needsAttribution = (l?: string | null) => !!l && /^CC[- ]BY/i.test(l)
/** رخصةٌ لا تشترط شيئاً */
const isFree = (l?: string | null) => !!l && /public domain|^PD$|CC0/i.test(l)
/** غير حرّة — تُستعمل على ويكيبيديا بالاستشهاد العادل */
const isNonFree = (l?: string | null) => !!l && /fair use|استعمال عادل/i.test(l)

interface Props { onBack: () => void }

export function Credits({ onBack }: Props) {
  const groups = useMemo(() => {
    const attribution = credits.filter((c) => needsAttribution(c.license))
    const free = credits.filter((c) => isFree(c.license))
    const nonFree = credits.filter((c) => isNonFree(c.license))
    const rest = credits.filter(
      (c) => !needsAttribution(c.license) && !isFree(c.license) && !isNonFree(c.license),
    )
    return { attribution, free, nonFree, rest }
  }, [])

  const row = (c: Credit) => (
    <li key={c.file} className="credit">
      <span className="credit-name">{c.nameAr}</span>
      <span className="credit-meta">
        {c.author && <span className="credit-author">{c.author}</span>}
        {c.license && (
          c.licenseUrl ? (
            <a className="credit-lic ltr" href={c.licenseUrl} target="_blank" rel="noreferrer">
              {c.license}
            </a>
          ) : (
            <span className="credit-lic ltr">{c.license}</span>
          )
        )}
        {c.page && (
          <a className="credit-src" href={c.page} target="_blank" rel="noreferrer">
            المصدر
          </a>
        )}
      </span>
    </li>
  )

  const section = (title: string, note: string, list: Credit[]) =>
    list.length > 0 && (
      <section className="credit-group">
        <h2>
          {title} <span className="ltr credit-count">{list.length}</span>
        </h2>
        <p className="credit-note">{note}</p>
        <ul className="credit-list">{list.map(row)}</ul>
      </section>
    )

  return (
    <div className="credits">
      <header className="credits-head">
        <h1>مصادر الصور</h1>
        <p>
          صور اللعبة مأخوذة من ويكيميديا كومنز وويكيبيديا، وتبقى تحت رخصها الأصلية.
          هذه قائمةٌ بها جميعاً — <span className="ltr">{credits.length}</span> صورة.
        </p>
        <button className="btn btn-quiet" onClick={onBack}>رجوع</button>
      </header>

      {section(
        'صور تشترط نسبها إلى أصحابها',
        'رخص المشاع الإبداعي «نسب المُصنَّف» — يُذكر المؤلّف والرخصة، وهو ما تفعله هذه الصفحة.',
        groups.attribution,
      )}

      {section(
        'صور في الملكية العامة',
        'لا تشترط رخصتها شيئاً، وتُذكر هنا للأمانة لا للالتزام.',
        groups.free,
      )}

      {section(
        'شعارات محفوظة الحقوق',
        'شعاراتٌ مملوكة لأصحابها، مرفوعة على ويكيبيديا بالاستشهاد العادل في سياقها الموسوعي. ' +
          'تُعرض هنا للتعريف بالجهة لا أكثر، ولا تدّعي اللعبة ملكيتها ولا ترخيصها.',
        groups.nonFree,
      )}

      {section('رخص أخرى', 'رخصٌ حرّة أخرى، لكلٍّ شرطها.', groups.rest)}
    </div>
  )
}
