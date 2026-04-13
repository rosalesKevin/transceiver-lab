/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        black:   '#030303',
        dark:    '#080808',
        mid:     '#0e0e0e',
        surface: '#111111',
        raised:  '#161616',
        // borders
        'b0': '#141414',
        'b1': '#1e1e1e',
        'b2': '#2e2e2e',
        // text
        't1': '#d4d4d4',
        't2': '#707070',
        't3': '#383838',
        // accents
        amber:  '#ffb000',
        green:  '#00ff87',
        red:    '#ff2244',
        yellow: '#ffdd00',
        blue:   '#4af',
        purple: '#a07af0',
      },
      fontSize: {
        '2xs': '10px',
        xs:    '11px',
        sm:    '12px',
        base:  '13px',
      },
      boxShadow: {
        'glow-amber': '0 0 8px rgba(255,176,0,0.45)',
        'glow-green': '0 0 8px rgba(0,255,135,0.45)',
        'glow-red':   '0 0 8px rgba(255,34,68,0.45)',
        'inner-amber':'inset 0 1px 0 rgba(255,176,0,0.06)',
      },
      animation: {
        'live': 'live 1.8s ease-in-out infinite',
        'blink': 'blink 1.1s step-end infinite',
      },
      keyframes: {
        live:  { '0%,100%': { opacity:'1' }, '50%': { opacity:'0.2' } },
        blink: { '0%,100%': { opacity:'1' }, '50%': { opacity:'0' } },
      },
    },
  },
  plugins: [],
}
