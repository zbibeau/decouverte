import type { Config } from 'tailwindcss';

/**
 * Manager design tokens — direction « D · Studio ».
 *
 * Surfaces / texte / primary / accents sont conduits par des variables CSS
 * définies dans `app/globals.css` (root = clair, .dark = sombre), au format
 * RGB triplet pour que les modifiers `/<alpha-value>` Tailwind marchent
 * (ex. `bg-primary/5`, `border-border/60`). Le rail graphite reste en valeurs
 * brutes — il est volontairement identique en clair et en sombre (signature
 * Studio), et n'a pas besoin de modifiers d'opacité.
 *
 * Les anciens tokens sémantiques (`background`, `foreground`, `muted`,
 * `muted-foreground`, `accent`, `destructive`) sont conservés mais re-mappés
 * vers les vars Studio, pour que chaque `bg-muted/40` / `text-foreground` /
 * etc. déjà présents dans le code continue de marcher SANS refactor — la
 * couleur change visuellement (et passe en dark mode), pas l'API CSS.
 *
 * Les palettes brand-* d'origine restent disponibles pour les composants
 * legacy qui les utilisent explicitement (loader MfmLoader, certains badges).
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
  info: { 50: '#EEF5FF', 500: '#357BFC', 600: '#1F5BF1', 700: '#1745DE' },
  success: { 50: '#F6FEE7', 500: '#7CC81A', 600: '#5EA010', 700: '#497A11' },
  warning: { 50: '#FEFDE8', 500: '#EFBE03', 600: '#CE9300', 700: '#A46904' },
  danger: { 50: '#FFF2F1', 500: '#F8453B', 600: '#E5271D', 700: '#C11D14' },
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
  // Dark-mode counterparts — consumed by tagColors.ts via `darkBg`/`darkFg`
  // and concatenated with the base classes. JIT can't infer interpolated
  // class names so we list each shade explicitly.
  `dark:bg-${c}-900`,
  `dark:bg-${c}-900/50`,
  `dark:bg-${c}-800/60`,
  `dark:text-${c}-100`,
]);

const config: Config = {
  darkMode: 'class', // .dark sur <html>, géré par `ThemeBootstrap`
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  safelist: TAG_PALETTE_SAFELIST,
  theme: {
    extend: {
      colors: {
        // ── Studio surfaces ─────────────────────────────────────────────
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          faint: 'rgb(var(--text-faint) / <alpha-value>)',
        },

        // ── Studio primary (violet chirurgical) ─────────────────────────
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          strong: 'rgb(var(--primary-strong) / <alpha-value>)',
          weak: 'var(--primary-weak)', // alpha figée → pas de modifier
          'weak-border': 'var(--primary-weak-border)',
          on: 'rgb(var(--primary-on) / <alpha-value>)',
        },
        'on-primary': 'rgb(var(--on-primary) / <alpha-value>)',

        // ── Tones (rails + tags accents) ────────────────────────────────
        // Cohérent avec `lib/fieldRailColors.ts` et `lib/tagColors.ts` :
        // les valeurs hex y restent inchangées, mais les utilities
        // `bg-tone-rose`, `text-tone-emerald`, etc. permettent un usage
        // direct dans le markup quand on veut éviter le style inline.
        tone: {
          rose: 'rgb(var(--c-rose) / <alpha-value>)',
          amber: 'rgb(var(--c-amber) / <alpha-value>)',
          emerald: 'rgb(var(--c-emerald) / <alpha-value>)',
          violet: 'rgb(var(--c-violet) / <alpha-value>)',
          sky: 'rgb(var(--c-sky) / <alpha-value>)',
          slate: 'rgb(var(--c-slate) / <alpha-value>)',
        },

        // ── Rail graphite (Sidebar) — clair = sombre ────────────────────
        rail: {
          bg: 'var(--rail-bg)',
          border: 'var(--rail-border)',
          text: 'var(--rail-text)',
          muted: 'var(--rail-muted)',
          section: 'var(--rail-section)',
          'active-bg': 'var(--rail-active-bg)',
          'active-text': 'var(--rail-active-text)',
          'active-bar': 'var(--rail-active-bar)',
        },

        // ── Back-compat sémantique (composants legacy) ──────────────────
        // Tout `bg-muted/40`, `text-muted-foreground/70`, `border-border/60`
        // etc. déjà présent reste fonctionnel — les vars CSS Studio
        // alimentent la même clé, donc dark mode marche automatiquement.
        background: 'rgb(var(--surface) / <alpha-value>)',
        foreground: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--surface-2) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--text-muted) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--on-primary) / <alpha-value>)',
        accent: 'var(--primary-weak)',
        'accent-foreground': 'rgb(var(--primary-on) / <alpha-value>)',
        destructive: brand.danger[600],

        // ── Palettes brand complètes (legacy, ad-hoc) ───────────────────
        brand: brand,
      },
      borderRadius: {
        app: 'var(--radius)', // 14px — cartes / panneaux
        'app-sm': 'var(--radius-sm)', // 9px — champs / chips
        btn: 'var(--btn-radius)', // 10px — boutons
      },
      boxShadow: {
        app: 'var(--shadow)',
        'app-sm': 'var(--shadow-sm)',
        brand: '0 1px 2px 0 rgba(110, 30, 210, 0.06), 0 1px 3px 0 rgba(110, 30, 210, 0.10)',
      },
      ringColor: {
        app: 'var(--ring)',
      },
      fontFamily: {
        // `--font-figtree` et `--font-jetbrains` sont injectés par
        // `next/font/google` dans `app/layout.tsx`. Inter reste en
        // fallback historique (encore référencé par certaines vues).
        sans: ['var(--font-figtree)', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
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
