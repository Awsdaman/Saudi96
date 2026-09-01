import type { RoundId } from '../game/types'

/**
 * أيقونات خطّية مرسومة لكل جولة، بدل الرموز النصية.
 * كلها على شبكة 24×24 وبِسُمك خط موحّد، وترث لون النص عبر currentColor.
 */
export function RoundIcon({ round }: { round: RoundId | 'custom' }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (round) {
    // شعار: درع بنجمة ثمانية داخله
    case 'logos':
      return (
        <svg {...common}>
          <path d="M12 2.75 4.75 5.5v6c0 4.4 3 7.9 7.25 9.75 4.25-1.85 7.25-5.35 7.25-9.75v-6L12 2.75Z" />
          <path d="M12 8.2v6.6M8.7 11.5h6.6M9.7 9.2l4.6 4.6M14.3 9.2l-4.6 4.6" />
        </svg>
      )

    // معلم: واجهة صخرية منحوتة بمدخل، على هيئة مقابر الحِجر
    case 'landmarks':
      return (
        <svg {...common}>
          <path d="M3.5 21h17" />
          <path d="M5.5 21V7.5L12 3l6.5 4.5V21" />
          <path d="M10 21v-5.5a2 2 0 0 1 4 0V21" />
          <path d="M8.5 9.5h7" />
        </svg>
      )

    // منطقة: مؤشّر موقع فوق خريطة مطويّة
    case 'regions':
      return (
        <svg {...common}>
          <path d="M2.75 6.6 9 4.2v10.4l-6.25 2.4V6.6Z" />
          <path d="M9 4.2 15 6.2" />
          <path d="M21.25 6.6v4" />
          <path d="M17 20.5s3.6-3.3 3.6-6a3.6 3.6 0 1 0-7.2 0c0 2.7 3.6 6 3.6 6Z" />
          <circle cx="17" cy="14.4" r="1.25" />
        </svg>
      )

    // طبق: صحن جانبي مع بخار صاعد
    case 'dishes':
      return (
        <svg {...common}>
          <path d="M2.75 14.5h18.5a4 4 0 0 1-4 4H6.75a4 4 0 0 1-4-4Z" />
          <path d="M5.5 14.5a6.5 6.5 0 0 1 13 0" />
          <path d="M9.5 5.5c0-1 1-1.4 1-2.4M12 4.9c0-1 1-1.4 1-2.4M14.5 5.5c0-1 1-1.4 1-2.4" />
        </svg>
      )

    // شخصية: هيئة شخص بغترة وعقال
    case 'people':
      return (
        <svg {...common}>
          <path d="M7.4 9.6c0-2.9 2.1-5.1 4.6-5.1s4.6 2.2 4.6 5.1c0 2.6-2.1 4.9-4.6 4.9s-4.6-2.3-4.6-4.9Z" />
          <path d="M7.1 7.3h9.8" />
          <path d="M8.4 5.6h7.2" />
          <path d="M4.2 20.6c.6-3.2 3.8-5.2 7.8-5.2s7.2 2 7.8 5.2" />
        </svg>
      )

    // أسئلة: نجمة/وردة ثمانية — زخرفة هندسية سعودية
    case 'trivia':
      return (
        <svg {...common}>
          <path d="M12 2.5 14.4 7l5 .6-3.6 3.5.9 4.9-4.7-2.4-4.7 2.4.9-4.9L4.6 7.6l5-.6L12 2.5Z" />
          <path d="M6.5 19.5h11" />
          <path d="M8.5 22h7" />
        </svg>
      )

    // لعبتي: مربعات مختارة مع علامة زائد
    case 'custom':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
          <path d="M17.25 13.9v7.2M13.65 17.5h7.2" />
        </svg>
      )
  }
}
