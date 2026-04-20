/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"

  ],
  theme: {
    extend: {
      colors: {
        brandFrom: 'rgb(var(--g360-from) / <alpha-value>)',
        brandTo: 'rgb(var(--g360-to) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}

