/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          page: 'var(--color-bg-page)',
          section: 'var(--color-bg-section)',
          card: 'var(--color-bg-card)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
          hover: 'var(--color-primary-hover)',
        },
        text: {
          main: 'var(--color-text-main)',
          muted: 'var(--color-text-muted)',
          amber: 'var(--color-text-amber)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
        },
        factor: {
          track: 'var(--color-factor-track)',
          fill: 'var(--color-factor-fill)',
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        restrained: '0 1px 2px 0 rgba(27, 42, 73, 0.04)',
        none: 'none',
      }
    },
  },
  plugins: [],
};

