import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#17140f',
          soft: '#2a2620',
          muted: '#403b33',
        },
        gold: {
          DEFAULT: '#a9822f',
          dark: '#8a6a24',
          light: '#f6ecd6',
          faint: '#fdf9f0',
        },
        cream: {
          DEFAULT: '#faf8f4',
          dark: '#f0ece3',
          card: '#ffffff',
        },
        border: '#e8e3da',
        text: {
          DEFAULT: '#201d18',
          muted: '#6b6459',
          faint: '#a39c8c',
        },
        primary: {
          DEFAULT: '#17140f',
          foreground: '#faf8f4',
        },
        accent: {
          DEFAULT: '#a9822f',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 20, 15, 0.04), 0 4px 16px rgba(23, 20, 15, 0.05)',
        pop: '0 12px 32px rgba(23, 20, 15, 0.12)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
    },
  },
  plugins: [],
};

export default config;
