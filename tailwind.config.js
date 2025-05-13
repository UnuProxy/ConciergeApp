// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",            // for any classes in your HTML template
    "./src/**/*.{js,jsx,ts,tsx}" // all React components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

