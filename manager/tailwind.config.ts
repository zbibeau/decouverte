import type { Config } from 'tailwindcss';

/**
 * Manager design tokens — aligned with the MadeForMed front charte graphique.
 * Semantic aliases (primary / muted / border / …) keep all existing components
 * working without refactor; the full brand palettes are also exposed for ad-hoc
 * use (e.g. `bg-brand-primary-50`, `text-brand-success-700`).
 */
const brand = {
  primary: {
    50: '#F9F5FF',
    100: '#F1E7FF',
    200: '#E5D4FF',
    300: '#D1B2FF',
    400: '#B480FF',
    500: '#9951FB',
    600: '#822EEF',
    700: '#6E1ED2',
    800: '#5E1EAB',
    900: '#4E198A',
    950: '#320566',
  },
  secondary: {
    50: '#FFF8EE',
    100: '#FFEDDB',
    200: '#FFD8A5',
    300: '#FFC878',
    400: '#FFAA33',
    500: '#EFAF03',
    600: '#C48000',
    700: '#B37E00',
    800: '#996600',
    900: '#6B4700',
    950: '#4D2D00',
  },
  dark: {
    50: '#F5F8FA',
    100: '#EAEFF4',
    200: '#D1DDE6',
    300: '#A8C0D1',
    400: '#799EB7',
    500: '#58829F',
    600: '#446885',
    700: '#38556C',
    800: '#31485B',
    900: '#2D3E4D',
    950: '#1C2630',
  },
  info: {
    50: '#EEF5FF',
    500: '#357BFC',
    600: '#1F5BF1',
    700: '#1745DE',
  },
  success: {
    50: '#F6FEE7',
    500: '#7CC81A',
    600: '#5EA010',
    700: '#497A11',
  },
  warning: {
    50: '#FEFDE8',
    500: '#EFBE03',
    600: '#CE9300',
    700: '#A46904',
  },
  danger: {
    50: '#FFF2F1',
    500: '#F8453B',
    600: '#E5271D',
    700: '#C11D14',
  },
};

// Maintenance-tag color palette — must be safelisted because the
// `TAG_COLOR_CLASSES` map in `lib/tagColors.ts` declares the bg / fg /
// ring / dot classes as static strings consumed at runtime via
// `${cls.bg}` template literals. Tailwind's JIT scans source files
// for class-name-shaped substrings, which works for shades that
// happen to appear elsewhere in `app/` or `components/` (amber, sky,
// violet) but misses the ones that exist ONLY in tagColors.ts (rose,
// orange were broken — chips rendered without a background). Listing
// the full triplet here guarantees every palette key works regardless
// of where the file lives.
const TAG_PALETTE_SAFELIST = ['amber', 'rose', 'sky', 'emerald', 'violet', 'slate', 'orange', 'gray'].flatMap((c) => [
  `bg-${c}-100`,
  `text-${c}-900`,
  `ring-${c}-300`,
  `bg-${c}-400`,
]);

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  safelist: TAG_PALETTE_SAFELIST,
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (used by Button/Card/Input/Sidebar) ─────────────
        border: brand.dark[100],
        background: '#ffffff',
        foreground: brand.dark[950],
        muted: brand.dark[50],
        'muted-foreground': brand.dark[500],
        primary: brand.primary[600],
        'primary-foreground': '#ffffff',
        accent: brand.primary[50],
        'accent-foreground': brand.primary[700],
        destructive: brand.danger[600],

        // ── Full brand palettes ─────────────────────────────────────────────
        brand: brand,
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        brand: '0 1px 2px 0 rgba(110, 30, 210, 0.06), 0 1px 3px 0 rgba(110, 30, 210, 0.10)',
      },
      backgroundImage: {
        'brand-radial': 'radial-gradient(100% 100% at 50% 0%, rgba(180, 128, 255, 0.18) 0%, rgba(255,255,255,0) 70%)',
      },
      // ── MfmLoader animation ──────────────────────────────────────────────
      // `mfm-spin`   : slow counter-clockwise rotation of the brand splat.
      //                3.6 s feels « alive but not dizzying » with the
      //                asymmetric 7-arm shape ; faster reads as a fan,
      //                slower reads as broken. Counter-clockwise is a
      //                deliberate choice to differentiate from generic
      //                « loading spinner » clockwise rotation.
      // `mfm-breath` : subtle scale pulse, layered on top of the spin so
      //                the logo feels organic (« breathing ») rather than
      //                purely mechanical. Tuned to a 2 s cycle so it
      //                desyncs with the rotation and never feels like a
      //                repeating loop.
      // `mfm-halo`   : kept for legacy Suspense fallbacks that still want
      //                a ring pulse — the new loader doesn't use it but
      //                other in-page loaders might.
      keyframes: {
        'mfm-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
        'mfm-breath': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.88)' },
        },
        // `mfm-twinkle` runs on each individual arm of the splat with a
        // per-arm `animationDelay`, producing a wave of light that
        // travels around the logo. Opacity floor of 0.45 keeps every
        // arm visible at all times — the wave reads as "highlight
        // moving" rather than "arms appearing and disappearing".
        'mfm-twinkle': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
        'mfm-halo': {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '20%': { opacity: '0.75' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
      },
      animation: {
        'mfm-spin': 'mfm-spin 3.6s linear infinite',
        'mfm-breath': 'mfm-breath 2s ease-in-out infinite',
        'mfm-twinkle': 'mfm-twinkle 2.4s ease-in-out infinite',
        'mfm-halo': 'mfm-halo 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
