/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0E7490',
          50: '#F2FAFD',
          100: '#DDF2F8',
          200: '#BFE5F1',
          300: '#92D1E6',
          400: '#5AB6D8',
          500: '#2B97C7',
          600: '#0E7490',
          700: '#0D5E77',
          800: '#114D63',
          900: '#143F52'
        },
        sea: '#2B97C7',
        teal: '#14B8A6',
        ocean: '#0E7490',
        bondi: '#0D5E77',
        cerulean: '#143F52',
        white: '#FFFFFF'
      },
      backgroundImage: {
        'brand-radial': 'radial-gradient(circle at top left, rgba(43, 151, 199, 0.16), transparent 34%), radial-gradient(circle at top right, rgba(14, 116, 144, 0.15), transparent 30%), linear-gradient(180deg, #f8fdff 0%, #f3f9fc 40%, #edf5f8 100%)'
      },
      boxShadow: {
        soft: '0 16px 36px rgba(20, 63, 82, 0.12)',
        'card': '0 4px 12px rgba(20, 63, 82, 0.08)',
        'hover': '0 12px 24px rgba(20, 63, 82, 0.12)'
      },
      spacing: {
        'xs': '0.5rem',
        'sm': '1rem',
        'md': '1.5rem',
        'lg': '2rem',
        'xl': '3rem',
        '2xl': '4rem'
      }
    }
  },
  plugins: []
};
