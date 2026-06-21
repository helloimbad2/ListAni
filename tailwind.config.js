/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080811',
        surface: '#0f1018',
        card: '#161720',
        'card-hover': '#1e1f2b',
        border: 'rgba(255,255,255,0.07)',
        accent: '#e8630a',
        'accent-light': '#f97316',
        'text-base': '#f0f0f8',
        'text-muted': '#7878a0',
        'text-dim': '#3a3a52',
        'tier-s': '#ff5757',
        'tier-a': '#ffbe4f',
        'tier-b': '#4fbdff',
        'tier-c': '#4fdb8e',
        'tier-d': '#c084fc',
        'tier-f': '#6b7280',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      backgroundImage: {
        'card-gradient': 'linear-gradient(180deg, transparent 40%, rgba(8,8,17,0.95) 100%)',
      },
    },
  },
  plugins: [],
}
