/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#090d16",
        "electric-blue": "#3B82F6",
        "emerald-glow": "#10B981",
      },
      backdropBlur: {
        xl: "24px",
      },
    },
  },
  plugins: [],
};
