import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // LipaAction brand + semantic priority tokens.
        brand: {
          50: "#f0f7f2",
          100: "#dbeee0",
          200: "#b8ddc4",
          300: "#8bc6a0",
          400: "#59a878",
          500: "#357a53", // primary brand green (Validate / active nav / logo mark)
          600: "#276142",
          700: "#204e36",
          800: "#1b3f2c",
          900: "#173525",
        },
        priority: {
          critical: "#c0362c", // Critical badge red
          criticalBg: "#fbeae9",
          high: "#c9722b", // High badge orange
          highBg: "#fdf0e3",
          medium: "#b8901f", // Medium badge amber
          mediumBg: "#fbf3dd",
          low: "#4d7c8a", // Low badge slate-teal
          lowBg: "#e9f2f4",
        },
        ink: {
          900: "#161c19",
          700: "#3a443f",
          500: "#657168",
          300: "#a4ada2",
          100: "#e4e8e2",
          50: "#f6f8f5",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgb(22 28 25 / 0.06), 0 1px 3px 0 rgb(22 28 25 / 0.08)",
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
