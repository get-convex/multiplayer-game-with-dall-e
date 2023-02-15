/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      display: ["Roboto Flex", "sans-serif"],
      sans: ["Inter", "sans-serif"],
    },
    extend: {
      colors: {
        "neutral-white": "#ffffff",
        "neutral-black": "#000000",
      },
    },
  },
  plugins: [],
};
