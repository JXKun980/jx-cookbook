/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#c5a55a',
          light: '#d9bd72',
          dim: '#8a7440',
        },
        surface: {
          DEFAULT: '#080808',
          light: '#121212',
          lighter: '#1e1e1e',
        },
        text: {
          DEFAULT: '#ede6d6',
          muted: '#6b6459',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
