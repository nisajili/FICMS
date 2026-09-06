import type { Config } from 'tailwindcss';

/**
 * White-label theme. Brand colors are driven by CSS variables set at runtime
 * from the clinic's configured `PRIMARY_COLOR`/`SECONDARY_COLOR`. The Tailwind
 * palette references those variables so no clinic color is hard-coded.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50)',
          100: 'var(--brand-100)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          800: 'var(--brand-800)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
