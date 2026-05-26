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
          // Light warm sandy background
          dark: '#F5EDE0',
          // Off-white card surface
          card: '#FFFDF8',
          'card-hover': '#FAF5EB',
          // Warm sandy border
          border: '#E8D5B8',
          // Deep terracotta (coastal warm) — primary action
          accent: '#96543A',
          'accent-hover': '#A86448',
          'accent-muted': '#96543A18',
          // Warm dark text
          text: '#1A0E08',
          muted: '#8A7060',
          // Sage green (success) from palette swatch
          success: '#4E8A48',
          // Red error
          error: '#C83830',
          // Muted teal (from swatch 4) — informational
          teal: '#5A8A96',
          // Sandy highlight (from swatch 3)
          sand: '#C4A882',
        },
      },
      fontFamily: {
        sans: ['Karla', 'system-ui', 'sans-serif'],
        display: ['"Paytone One"', '"Arial Black"', 'system-ui', 'sans-serif'],
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
