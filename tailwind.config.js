/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Barlow Condensed', 'system-ui'],
        body:    ['var(--font-body)',    'Inter',            'system-ui'],
      },
      colors: {
        gold:    'var(--accent-gold)',
        green:   'var(--accent-green)',
        danger:  'var(--accent-red)',
        surface: 'var(--bg-surface)',
        base:    'var(--bg-base)',
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease forwards',
        'fade-in':  'fade-in 0.3s ease forwards',
      },
    },
  },
  plugins: [],
}
