/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: 'var(--color-primary, #10b981)',
          secondary: 'var(--color-secondary, #3b82f6)',
          tertiary: 'var(--color-tertiary, #8b5cf6)',
        },
        fontFamily: {
          sans: ['var(--font-family)', 'system-ui', 'sans-serif'],
        },
        fontSize: {
          base: 'var(--font-size-base, 1rem)',
          lg: 'var(--font-size-lg, 1.125rem)',
          xl: 'var(--font-size-xl, 1.25rem)',
        },
      },
    },
    plugins: [],
  }