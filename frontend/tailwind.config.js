/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg1: "#0f2027",
        bg2: "#28623a",
        glass: "rgba(255,255,255,0.08)",
        borderGlass: "rgba(255,255,255,0.14)",
      },
      boxShadow: {
        glow: "0 0 30px rgba(40, 98, 58, 0.35)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0px)" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        fadeUp: "fadeUp 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

