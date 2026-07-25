/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sky: {
          DEFAULT: 'var(--ui-sky)',
          50: 'var(--ui-sky-100)',
          100: 'var(--ui-sky-100)',
          200: 'var(--ui-sky-200)',
          300: 'var(--ui-sky-300)',
          400: 'var(--ui-sky-400)',
          500: 'var(--ui-sky-500)',
          600: 'var(--ui-sky-500)',
        },
        cyan: { DEFAULT: 'var(--ui-cyan)', soft: '#9bd9e8', dark: '#4a9fb8' },
        grass: { DEFAULT: 'var(--ui-grass)', light: '#6fbf6f', dark: '#2f6b34' },
        gold: { DEFAULT: 'var(--ui-gold)', light: '#ffe884', dark: '#d99a17', deep: '#b8860b' },
        pink: { DEFAULT: 'var(--ui-pink)', light: '#ff8fb3', dark: '#d63b6b' },
        cream: { DEFAULT: 'var(--ui-cream)', soft: '#fbf3e0', dark: '#d8c9a6' },
        purple: { DEFAULT: 'var(--ui-purple)', light: '#a98fd6', dark: '#5f4496' },
        forest: { DEFAULT: 'var(--ui-forest)', light: '#2f5a36', dark: '#142a18' },
        ink: { DEFAULT: 'var(--ui-ink)', soft: '#2a2438' },
        night: 'var(--ui-night)',
        fg: { DEFAULT: 'var(--ui-fg)', muted: 'var(--ui-fg-muted)' },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        body: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        pixel: '4px 4px 0 0 rgba(13,15,43,0.55)',
        'pixel-sm': '2px 2px 0 0 rgba(13,15,43,0.55)',
        'pixel-lg': '6px 6px 0 0 rgba(13,15,43,0.6)',
        glow: '0 0 24px rgba(255,210,63,0.45)',
        'glow-pink': '0 0 22px rgba(255,93,143,0.5)',
      },
      borderRadius: {
        pixel: '2px',
      },
      keyframes: {
        bob: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        sway: {
          '0%,100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        twinkle: {
          '0%,100%': { opacity: '0.25', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        drift: {
          '0%': { transform: 'translateX(-10vw)' },
          '100%': { transform: 'translateX(110vw)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(6px)' },
          '60%': { transform: 'scale(1.02) translateY(0)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        sparkle: {
          '0%,100%': { opacity: '0', transform: 'scale(0.4) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1) rotate(90deg)' },
        },
        flicker: {
          '0%,100%': { opacity: '0.92' },
          '50%': { opacity: '0.98' },
        },
      },
      animation: {
        bob: 'bob 2.4s ease-in-out infinite',
        floaty: 'floaty 5s ease-in-out infinite',
        sway: 'sway 3.5s ease-in-out infinite',
        twinkle: 'twinkle 2.6s ease-in-out infinite',
        drift: 'drift 40s linear infinite',
        fadeUp: 'fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        popIn: 'popIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        sparkle: 'sparkle 1.8s ease-in-out infinite',
        flicker: 'flicker 4s linear infinite',
      },
    },
  },
  plugins: [],
};
