// @ts-nocheck
/* eslint-disable @typescript-eslint/no-var-requires */
/** @type {import('tailwindcss').Config} */
const merge = require('lodash/merge');

module.exports = merge({
  // INFO : USE IT ONLY IF NEEDED
  safelist: [],
  content: ['./src/**/*.{html,js,jsx,ts,tsx}'],
  darkMode: ['class', '[data-mode="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        madeformed: ['MadeForMed', 'sans-serif'],
        sans: ['Steradian', 'sans-serif'],
      },
      colors: {
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
          100: '#DAE9FF',
          200: '#BDD9FF',
          300: '#90C2FF',
          400: '#66A6FF',
          500: '#357BFC',
          600: '#1F5BF1',
          700: '#1745DE',
          800: '#1939B4',
          900: '#1A358E',
          950: '#152256',
        },
        success: {
          50: '#F6FEE7',
          100: '#EAFBCC',
          200: '#D4F79F',
          300: '#B8EF67',
          400: '#8FDF20',
          500: '#7CC81A',
          600: '#5EA010',
          700: '#497A11',
          800: '#3C6014',
          900: '#345215',
          950: '#182D06',
        },
        warning: {
          50: '#FEFDE8',
          100: '#FFFCC2',
          200: '#FFF687',
          300: '#FFEA43',
          400: '#FFD91A',
          500: '#EFBE03',
          600: '#CE9300',
          700: '#A46904',
          800: '#88510B',
          900: '#734210',
          950: '#432205',
        },
        danger: {
          50: '#FFF2F1',
          100: '#FFE3E1',
          200: '#FFCAC7',
          300: '#FFA5A0',
          400: '#FF6E66',
          500: '#F8453B',
          600: '#E5271D',
          700: '#C11D14',
          800: '#A01B14',
          900: '#841E18',
          950: '#480A07',
        },
        White: '#ffffff',
        Black: '#000000',

        // For Video Story
        'media-brand': '#f5f5f5',
        'media-focus': '#66A6FF',
      },
      backgroundImage: {
        'video-radial-gradient': 'radial-gradient(100% 100% at 50% 0%, rgba(180, 128, 255, 0.33) 0%, #B480FF 100%)',
      },
      boxShadow: {
        'inner-1px': 'inset 0 0 0 1px',
        'inner-2px': 'inset 0 0 0 2px',
        '3px': '0 0 0 3px',
      },
      fontSize: {
        '075em': '0.75em',
      },
      width: {
        '75%': '75%',
        4.5: '1.125rem',
      },
      height: {
        '75%': '75%',
        4.5: '1.125rem',
      },
      fontWeight: {
        ultralight: 285,
      },
    },
  },
  plugins: [
    require('tailwindcss/plugin')(function ({ addVariant }) {
      // @ts-ignore
      addVariant('em', ({ container }) => {
        container.walkRules((rule) => {
          rule.selector = `.em\\:${rule.selector.slice(1)}`;
          rule.walkDecls((decl) => {
            decl.value = decl.value.replace('rem', 'em');
          });
        });
      });
    }),
    // For Video Story
    require('vidstack/tailwind.cjs')({
      prefix: 'media',
      webComponents: true,
    }),
    function customVariants({ addVariant, matchVariant }) {
      // Strict version of `.group` to help with nesting.
      matchVariant('parent-data', (value) => `.parent[data-${value}] > &`);

      addVariant('hocus', ['&:hover', '&:focus-visible']);
      addVariant('group-hocus', ['.group:hover &', '.group:focus-visible &']);
    },
  ],
}, {
  // INFO : USE IT ONLY IF NEEDED
  safelist: ['bg-contain'],
  content: ['src/components/**/*.{html,js,jsx,ts,tsx}'],
  darkMode: ['class', '[data-mode="dark"]'],
  theme: {
    extend: {
      colors: {
        'shadow-sidebar': '#663D001A',
        'ocre-2': '#FFDBA8',
        'ocre-4': '#FFA300',
      },
      fontFamily: {
        doctorline: ['Doctorline', 'sans-serif'],
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(100% 100% at 50% 0%, rgba(181, 128, 255, 0.33) 0%, #B580FF 100%)',
        'radial-gradient-gray':
          'radial-gradient(459.18% 100% at 100% 42.86%, #D4D4D4 1000%, #F5F5F5 30.33%, #EBEBEB 100%)',
      },
      backgroundSize: {
        16: '4rem',
      },
      boxShadow: {
        sidebar: '0px 0px 8px',
      },
      screens: {
        xs: '555px',
      },
      keyframes: {
        'video-fullscreen': {
          from: { maxWidth: '50%', maxHeight: '50%' },
          to: { maxWidth: '100%', maxHeight: '100%' },
        },
      },
      animation: {
        'video-fullscreen': 'video-fullscreen 1000ms',
      },
    },
  },
  plugins: [],
});
