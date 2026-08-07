import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDEEE6",
        paperDark: "#E2E4D6",
        panel: "#F5F5EE",
        ink: "#1B2B3A",
        inkMuted: "#54626B",
        stampRed: "#B23A2E",
        verified: "#2F6844",
        warning: "#C98A1D",
        hairline: "#C7CABC",
      },
      fontFamily: {
        display: ["var(--font-typewriter)", "monospace"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        stamp: "0 0 0 1px rgba(27,43,58,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
