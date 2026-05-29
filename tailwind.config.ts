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
          dark: '#dbd2b5',
          // Off-white card surface
          card: '#e8e0ca',
          'card-hover': '#e0d8c0',
          // Warm sandy border
          border: '#cab892',
          // Deep terracotta (coastal warm) â€” primary action
          accent: '#6e8f7a',
          'accent-hover': '#5d7d6a',
          'accent-muted': '#6e8f7a1a',
          // Warm dark text
          text: '#1f2d27',
          muted: '#6a7d72',
          // Sage green (success) from palette swatch
          success: '#4E8A48',
          // Red error
          error: '#C83830',
          // Muted teal (from swatch 4) â€” informational
          teal: '#6e8f7a',
          // Sandy highlight (from swatch 3)
          sand: '#cab892',
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

