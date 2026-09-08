/** أنواع البيانات الأساسية للعبة */

export type RoundId = 'logos' | 'landmarks' | 'regions' | 'dishes' | 'people' | 'trivia'

/** 1 = يعرفه الجميع · 4 = خبير/مصيدة */
export type Difficulty = 1 | 2 | 3 | 4

/**
 * آلية الكشف التدريجي عن الصورة.
 *  blur — ضبابية تنقشع تدريجياً (الفئة ب: الشعارات ذات الرمز الوطني)
 *  zoom — تبدأ من تفصيل مقصوص ثم تتّسع الصورة (المعالم)
 *  none — تظهر الصورة كاملة من البداية (الفئة أ: رمزٌ مقصوصٌ بلا اسم)
 */
export type RevealKind = 'blur' | 'zoom' | 'none'

export interface Question {
  id: string
  round: RoundId
  /** نص السؤال بالعربية */
  prompt: string
  /** مسار الصورة تحت public/assets — يبقى فارغاً حتى تُجلب الأصول */
  image?: string
  reveal?: RevealKind
  options: string[]
  answerIndex: number
  /** يظهر بعد الإجابة */
  explanation?: string
  difficulty: Difficulty
  category?: string
  sourceUrl?: string
}

/** جهة حكومية أو شركة أو مشروع — مصدر أسئلة جولة الشعارات */
export interface Entity {
  id: string
  /** الاسم الرسمي الكامل */
  nameAr: string
  /** الاسم المختصر المستخدم في خيارات الإجابة */
  shortAr: string
  type: 'ministry' | 'authority' | 'commission' | 'company' | 'project' | 'app' | 'club'
  /**
   * أ — للجهة رمز بصري مميّز، فيُقصّ الرمز وحده ويُخفى الاسم.
   * ب — شعارها مبني على الرمز الوطني (السيفان والنخلة) المشترك بين نحو ٥٨ جهة،
   *     فقصّ الرمز يعطي صوراً متطابقة. الحل: إخفاء الاسم بالضبابية بدل قصّ الرمز.
   */
  tier: 'A' | 'B'
  /** الرمز وحده بلا اسم */
  logo?: string
  /** الشعار الكامل مع الاسم */
  lockup?: string
  site?: string
  /** هل جرى التحقق من التصنيف بمعاينة الشعار فعلياً؟ */
  tierVerified?: boolean
  /**
   * قصّة تُظهر الرمز وحده وتُخفي الاسم المكتوب، بالنسبة المئوية من الصورة.
   * الكلام داخل هذه الشعارات محوَّل إلى مسارات رسومية لا نصوص،
   * فلا سبيل لحذفه برمجياً — القصّ هو الحل العملي.
   * تُترك فارغة للشعارات التي هي كلامٌ أصلاً (جوسي، stc…).
   */
  crop?: { x: number; y: number; w: number; h: number }
}

export interface RoundMeta {
  id: RoundId
  title: string
  subtitle: string
  icon: string
  /** خطوات «كيف تلعب» — تظهر قبل الجولة وعند الضغط على ؟ */
  howTo: string[]
}
