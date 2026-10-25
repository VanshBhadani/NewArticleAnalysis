/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FBFBF9',
        surface: '#FFFFFF',
        subtle: '#F6F6F3',
        'border-light': '#E5E7EB',
        'border-strong': '#D1D5DB',
        ink: {
          DEFAULT: '#111827',
          muted: '#4B5563',
          dim: '#6B7280',
        },
        forest: {
          DEFAULT: '#0D5C3A',
          dark: '#09472C',
          light: '#E8F5EE',
          border: '#A7F3D0',
        },
        desk: {
          world: '#1E3A8A',
          'world-bg': '#EFF6FF',
          'world-border': '#BFDBFE',
          sports: '#047857',
          'sports-bg': '#ECFDF5',
          'sports-border': '#A7F3D0',
          business: '#B45309',
          'business-bg': '#FFFBEB',
          'business-border': '#FDE68A',
          scitech: '#4338CA',
          'scitech-bg': '#EEF2FF',
          'scitech-border': '#C7D2FE',
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'editorial': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.06)',
        'brutal': '2px 2px 0px 0px rgba(17, 24, 39, 1)',
      }
    },
  },
  plugins: [],
}
