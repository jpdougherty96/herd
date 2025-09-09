/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        herdGreen: "#2b7a33",
        herdBeige: "#f6f1e8",
        herdBrown: "#6b4423",
      },
    },
  },
  plugins: [],
}