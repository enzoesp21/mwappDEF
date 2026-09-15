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
          dark: '#dbd2b5',
          card: '#ffffff',
          'card-hover': '#f8f5f0',
          border: '#cab892',
          accent: '#6e8f7a',
          'accent-hover': '#5d7d6a',
          'accent-muted': '#6e8f7a1a',
          text: '#1f2d27',
          muted: '#6a7d72',
          success: '#4E8A48',
          error: '#C83830',
          teal: '#6e8f7a',
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
