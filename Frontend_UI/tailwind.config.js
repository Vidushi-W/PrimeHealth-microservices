/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5EB788',
          50: '#F3FBF6',
          100: '#DCF3E5',
          200: '#BCE6CD',
          300: '#93D5AE',
          400: '#6AC08F',
          500: '#5EB788',
          600: '#41966B',
          700: '#337353',
          800: '#295B43',
          900: '#224B38'
        }
      },
      boxShadow: {
        soft: '0 18px 40px rgba(94, 183, 136, 0.12)'
      }
    }
  },
  plugins: []
};
