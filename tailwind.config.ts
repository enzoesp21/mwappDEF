import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1a1a1a',
          card: '#242424',
          'card-hover': '#2a2a2a',
          border: '#333333',
          accent: '#D4A017',
          'accent-hover': '#E8B420',
          'accent-muted': '#D4A01720',
          text: '#F5F5F5',
          muted: '#A0A0A0',
          error: '#EF4444',
          success: '#22C55E',
        },
      },
      fontFamily: {
        sans: ['Karla', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display SC"', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
