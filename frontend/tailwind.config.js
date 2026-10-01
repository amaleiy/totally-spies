/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        woohp: {
          dark: '#0a0d14',
          card: '#111726',
          border: '#1e293b',
          accent: '#06b6d4',
          clover: '#10b981', // green for Clover
          sam: '#0ea5e9',    // teal/blue for Sam
          alex: '#f59e0b',   // yellow/amber for Alex
          jerry: '#ec4899',  // pink/magenta for WOOHP HQ
        }
      }
    },
  },
  plugins: [],
}
