/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  corePlugins: {
    preflight: false, // evita conflictos con estilos existentes
  },
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f7ff',
          100: '#e0f0ff',
          500: '#1e88e5',
          700: '#174a7a',
          800: '#0f3460',
        },
      },
    },
  },
  plugins: [],
};
