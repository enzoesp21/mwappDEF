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
          accent: '#516d5c',
          'accent-hover': '#476051',
          'accent-muted': '#516d5c1a',
          text: '#1f2d27',
          muted: '#56655c',
          success: '#4E8A48',
          error: '#C83830',
          teal: '#516d5c',
          sand: '#cab892',
        },
      },
      fontFamily: {
        // Las mismas letras que miradorwaikiki.com: Poppins para todo y una
        // serif en itálica para las frases ("Una propuesta diferente...").
        sans: ['Poppins', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['Poppins', '"Segoe UI"', 'system-ui', 'sans-serif'],
        serif: ['"Bodoni Moda"', 'Georgia', '"Times New Roman"', 'serif'],
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
