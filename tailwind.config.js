/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bakery: {
          50: '#FDFBF7',  // warm flour off-white
          100: '#F7F3EB', // light dough
          200: '#EFE7DA', // biscuit cream
          300: '#DECDBD',
          400: '#C8A98E',
          500: '#B08562',
          600: '#946542', // crust brown
          700: '#754B2F',
          800: '#54341F',
          900: '#382214',
        },
        brand: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          500: '#F97316',
          600: '#EA580C', // restrained artisan orange
          700: '#C2410C', // deep baked terracotta
        },
        charcoal: {
          900: '#1C1917', // stone-900
          800: '#292524',
          700: '#44403C',
          500: '#78716C',
          400: '#A8A29E',
          200: '#E7E5E4',
          100: '#F5F5F4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
};
