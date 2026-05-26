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

const config: Config = {
  // `lib/` must be scanned too : the maintenance-tag system stores its
  // color-class triplets (`bg-rose-100`, `bg-orange-100`, etc.) as
  // static strings in `lib/tagColors.ts`. Without scanning lib/, the
  // JIT only picks up shades that happen to also appear elsewhere
  // (amber, sky, violet are used in other components — rose and
  // orange were not, which is why their chips rendered without their
  // background color).
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
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
    },
  },
  plugins: [],
};

export default config;
