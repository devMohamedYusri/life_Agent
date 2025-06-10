// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
      "./pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
      // Or if using `src` directory:
      "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          // These pick up the CSS variables from your global styles (e.g., layout.tsx)
          sans: ['var(--font-geist-sans)', 'sans-serif'],
          mono: ['var(--font-geist-mono)', 'monospace'],
        },
        keyframes: {
          'fade-in-down': {
            '0%': {
              opacity: '0',
              transform: 'translateY(-20px)'
            },
            '100%': {
              opacity: '1',
              transform: 'translateY(0)'
            },
          },
          'fade-in-up': {
            '0%': {
              opacity: '0',
              transform: 'translateY(20px)'
            },
            '100%': {
              opacity: '1',
              transform: 'translateY(0)'
            },
          },
          'fade-in': {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
        },
        animation: {
          'fade-in-down': 'fade-in-down 0.7s ease-out forwards',
          'fade-in-up': 'fade-in-up 0.7s ease-out forwards',
          'fade-in': 'fade-in 0.8s ease-out forwards',
        },
      },
    },
    plugins: [],
  }