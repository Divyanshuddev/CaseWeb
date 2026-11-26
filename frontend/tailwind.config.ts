import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#151515",
        cork: "#70452D",
        paper: "#E8D4B0",
        "blood-red": "#B3262E",
        "muted-gray": "#777777",
        cream: "#F5EBD8",
      },
      fontFamily: {
        typewriter: ["'Special Elite'", "'Courier Prime'", "monospace"],
        serifVintage: ["'Playfair Display'", "Georgia", "serif"],
        handwriting: ["'Caveat'", "cursive"],
        sansClean: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 25px -5px rgba(0, 0, 0, 0.55), 0 4px 10px -2px rgba(0, 0, 0, 0.4)",
        pin: "0 3px 6px rgba(0, 0, 0, 0.65)",
      },
    },
  },
  plugins: [],
};

export default config;
