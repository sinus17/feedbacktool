/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Work Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f6ff',
          100: '#e0edff',
          200: '#c7ddff',
          300: '#a5c8ff',
          400: '#75a8ff',
          500: '#002a88',
          600: '#1a5fff',
          700: '#0047ff',
          800: '#0036cc',
          900: '#002a99',
        },
        dark: {
          50: '#F3F4F6',
          100: '#E5E7EB',
          200: '#D1D5DB',
          300: '#9CA3AF',
          400: '#6B7280',
          500: '#4B5563',
          600: '#374151',
          700: '#1C2530',
          800: '#111111',
          850: '#0C0C0C',
          900: '#111827',
          modal: '#121313',
        }
      },
    },
  },
  plugins: [],
};