/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: '#09090B',
        foreground: '#FAFAFA',
        card: {
          DEFAULT: '#18181B',
          foreground: '#FAFAFA'
        },
        popover: {
          DEFAULT: '#18181B',
          foreground: '#FAFAFA'
        },
        primary: {
          DEFAULT: '#FAFAFA',
          foreground: '#18181B'
        },
        secondary: {
          DEFAULT: '#27272A',
          foreground: '#FAFAFA'
        },
        muted: {
          DEFAULT: '#27272A',
          foreground: '#A1A1AA'
        },
        accent: {
          DEFAULT: '#27272A',
          foreground: '#FAFAFA'
        },
        destructive: {
          DEFAULT: '#7F1D1D',
          foreground: '#FEF2F2'
        },
        border: '#27272A',
        input: '#27272A',
        ring: '#D4D4D8',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        running: '#6366F1',
        skipped: '#71717A'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['IBM Plex Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}