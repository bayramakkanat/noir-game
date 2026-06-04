/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        noir: {
          bg:      '#0D0D14',
          surface: '#13131E',
          card:    '#1A1A28',
          border:  '#2A2A3E',
          accent:  '#C8A84B',
          red:     '#C0392B',
          blue:    '#2980B9',
          green:   '#1D9E75',
          text:    '#E8E6DC',
          muted:   '#7A7870',
          faint:   '#3A3A50',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
