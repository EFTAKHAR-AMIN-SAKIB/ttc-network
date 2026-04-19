import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1A56DB",
        accent: "#E63946",
        navy: {
          900: "#1a1c2e",
        },
        bg: "#FAFAFA",
        "bg-light": "#F0F0F0",
        "card-shadow": "rgba(180, 170, 220, 0.3)",
      },
      fontFamily: {
        bengali: ["var(--font-hind-siliguri)", "sans-serif"],
        english: ["var(--font-plus-jakarta)", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
      animation: {
        "orbit": "orbit 30s linear infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "slide-up": "slide-up 0.6s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
      },
      keyframes: {
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "glow-pulse": {
          "0%, 100%": { filter: "drop-shadow(0 0 20px rgba(230, 57, 70, 0.4))" },
          "50%": { filter: "drop-shadow(0 0 40px rgba(230, 57, 70, 0.7))" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
