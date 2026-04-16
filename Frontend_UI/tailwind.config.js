/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#34A0A4',
          50: '#F5FCFA',
          100: '#E8F7F1',
          200: '#CFEFE2',
          300: '#B5E48C',
          400: '#99D98C',
          500: '#76C893',
          600: '#52B69A',
          700: '#34A0A4',
          800: '#168AAD',
          900: '#1A759F'
        },
        mint: '#99D98C',
        sea: '#52B69A',
        ocean: '#34A0A4',
        bondi: '#168AAD',
        cerulean: '#1A759F',
        white: '#FFFFFF'
      },
      backgroundImage: {
        'brand-radial': 'radial-gradient(circle at top left, rgba(181, 228, 140, 0.22), transparent 34%), radial-gradient(circle at top right, rgba(22, 138, 173, 0.18), transparent 30%), linear-gradient(180deg, #ffffff 0%, #f6fcfb 40%, #ebf8f6 100%)'
      },
      boxShadow: {
        soft: '0 14px 34px rgba(26, 117, 159, 0.14)'
      }
    }
  },
  plugins: []
};
