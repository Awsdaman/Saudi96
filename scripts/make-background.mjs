// يولّد أصول الخلفية الموحّدة من مشهد الهوية الأصلي (play-bg.jpg):
//   bg-scene.jpg        المشهد الداخلي (بلا الإطار) — يملأ الشاشة بـ cover
//   bg-band-l/r.webp    شريطا السدو — يتكرّران عمودياً على حافتي الشاشة
//
// لماذا تُفصَل الأشرطة عن المشهد؟ الصورة الأصلية لوحةٌ مؤطَّرة بنسبةٍ ثابتة
// (1.9:1)؛ تمديدها بـ cover يقصّ الإطار على كل نافذةٍ بنسبةٍ أخرى. هنا يبقى
// الإطار كاملاً على أي نسبة، ويملأ المشهدُ ما بينهما.
//
// الوضوح: الأصل 1400px فقط. لا تُضاف تفاصيل غير موجودة، لكن الأصول تُكبَّر
// مسبقاً بـ Lanczos مع شحذٍ خفيف، فيصغّرها المتصفح على شاشات 1080p بدل أن
// يكبّرها (تكبير المتصفح يُنعّم الحواف)، ويقارب 1:1 على 4K.
//
//   node scripts/make-background.mjs            # يكتب في public/assets/identity
//   node scripts/make-background.mjs <outDir>   # أو في مجلدٍ آخر للتجربة
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const SRC = resolve('public/assets/identity/play-bg.jpg')
const OUT = resolve(process.argv[2] ?? 'public/assets/identity')

const BAND = 84          // عرض الشريط في الأصل (px) — يشمل الخطّين الرفيعين الداخليين
const RAMP_START = 66    // من هنا يبدأ تلاشي الحافة الداخلية للشريط نحو المشهد
const SCENE_H = 712      // يُقصّ ما تحته: خطّ الإطار السفلي (y≈716) يظهر خطّاً شاردًا
const SCALE = 3          // تكبيرٌ مسبق — يقارب 1:1 على شاشة 4K
const XFADE = 8          // صفوف المزج عند خطّ التكرار
const T_RANGE = [708, 722] // طول الدورة الصالح: نحو 6 وحدات زخرفية (~119px لكلٍّ)

if (!existsSync(SRC)) throw new Error(`المصدر غير موجود: ${SRC}`)
mkdirSync(OUT, { recursive: true })

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height
if (W !== 1400 || H !== 738) console.warn(`تنبيه: المصدر ${W}×${H} لا 1400×738 — راجع الثوابت أعلاه`)
const px = (x, y, c) => data[(y * W + x) * 3 + c]

/** أنسب طولٍ وبدايةٍ للدورة: أقلّ فرقٍ بين نهاية القطعة وبداية تكرارها */
function bestLoop(x0) {
  let best = null
  for (let T = T_RANGE[0]; T <= T_RANGE[1]; T++) {
    for (let y0 = 0; y0 + T + XFADE <= H; y0++) {
      let sum = 0, n = 0
      for (let k = 0; k < XFADE; k++) for (let x = 0; x < BAND; x += 2) for (let c = 0; c < 3; c++) {
        sum += Math.abs(px(x0 + x, y0 + k, c) - px(x0 + x, y0 + T + k, c)); n++
      }
      const err = sum / n
      if (!best || err < best.err) best = { T, y0, err }
    }
  }
  return best
}

const smoothstep = (a) => a * a * (3 - 2 * a)

for (const side of ['l', 'r']) {
  const x0 = side === 'l' ? 0 : W - BAND
  const { T, y0, err } = bestLoop(x0)
  // رأس القطعة يُمزَج مع الاستمرار الحقيقي لذيلها، فيلتحم التكرار بلا درز
  const rgba = Buffer.alloc(BAND * T * 4)
  for (let y = 0; y < T; y++) for (let x = 0; x < BAND; x++) {
    const d = side === 'l' ? x : BAND - 1 - x            // البعد عن حافة الشاشة
    const a = d <= RAMP_START ? 1 : Math.max(0, 1 - (d - RAMP_START) / (BAND - RAMP_START))
    const i = (y * BAND + x) * 4
    for (let c = 0; c < 3; c++) {
      let v = px(x0 + x, y0 + y, c)
      if (y < XFADE) {
        const t = y / XFADE
        v = Math.round((1 - t) * px(x0 + x, y0 + T + y, c) + t * v)
      }
      rgba[i + c] = v
    }
    rgba[i + 3] = Math.round(255 * smoothstep(a))
  }
  const file = resolve(OUT, `bg-band-${side}.webp`)
  await sharp(rgba, { raw: { width: BAND, height: T, channels: 4 } })
    .resize({ width: BAND * SCALE, height: T * SCALE, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.9, m1: 0.9, m2: 1.8 })
    .webp({ quality: 90, alphaQuality: 92 })
    .toFile(file)
  console.log(`bg-band-${side}.webp  دورة ${T}px من y=${y0}  فرق الالتحام ${err.toFixed(1)}`)
}

await sharp(SRC)
  .extract({ left: BAND, top: 0, width: W - 2 * BAND, height: SCENE_H })
  .resize({ width: (W - 2 * BAND) * SCALE, kernel: 'lanczos3' })
  .sharpen({ sigma: 1.0, m1: 0.5, m2: 1.2 })
  .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' })
  .toFile(resolve(OUT, 'bg-scene.jpg'))
console.log('bg-scene.jpg')
