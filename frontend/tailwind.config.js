/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Preflight (Tailwind's base CSS reset) is disabled on purpose: this app
  // already has a working plain-CSS design system (index.css) for every
  // existing page. Turning preflight on would silently restyle raw
  // elements (button, input, h1, ...) app-wide. Tailwind utility classes
  // still work everywhere they're explicitly used — only the global reset
  // layer is skipped.
  corePlugins: {
    preflight: false,
  },
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
