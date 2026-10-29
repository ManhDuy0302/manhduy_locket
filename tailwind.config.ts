import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#F6C445",
          deep: "#E8AE24",
        },
        surface: "#101012",
        elevated: "#1B1B1E",
        faint: "#8A8A90",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.12)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fade-up": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        flash: {
          "0%": { opacity: "0.9" },
          "100%": { opacity: "0" },
        },
        rain: {
          "0%": { transform: "translateY(-20%) scale(0.7)", opacity: "0" },
          "15%": { opacity: "1" },
          "85%": { opacity: "0.9" },
          "100%": { transform: "translateY(620%) scale(1.05)", opacity: "0" },
        },
      },
      animation: {
        pop: "pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        "fade-up": "fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
        fade: "fade 200ms ease-out both",
        flash: "flash 260ms ease-out forwards",
        rain: "rain 3.4s ease-in forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
