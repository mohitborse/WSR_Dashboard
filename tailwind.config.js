/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
        success: {
          50: '#f0fdf4',
          500: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          500: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          500: '#dc2626',
          700: '#b91c1c',
        },
      },
    },
  },
  plugins: [],
};
