/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#020617",
        accent: "#34d399",
        accentSoft: "#22d3ee"
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      },
      backgroundImage: {
        noise: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
