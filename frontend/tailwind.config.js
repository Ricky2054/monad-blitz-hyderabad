/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        monad: {
          purple: "#836EF9",
          dark: "#0D0D12",
          card: "#16161E",
          border: "#2A2A3A",
          glow: "#836EF933",
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px #836EF933" },
          "50%": { boxShadow: "0 0 40px #836EF966" },
        },
      },
    },
  },
  plugins: [],
};
