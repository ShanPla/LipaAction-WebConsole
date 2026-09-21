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
        // var() first: the self-hosted faces loaded in layout.tsx via next/font.
        // The names after it are the fallback if that ever fails to load.
        sans: [
          "var(--font-inter)",
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgb(22 28 25 / 0.06), 0 1px 3px 0 rgb(22 28 25 / 0.08)",
      },
      borderRadius: {
        card: "10px",
      },
      // Three animations, each carrying meaning rather than decoration: a
      // row that has just arrived on its own, a toast entering, and the
      // detail drawer coming in from the edge it sits on. All are applied
      // through Tailwind's `motion-safe:` variant, so a viewer who asks for
      // reduced motion gets the same information without movement — the
      // arrived row keeps a static tint and a New chip instead.
      keyframes: {
        arrival: {
          // Holds the tint long enough to be noticed if the official looked
          // away, then clears itself.
          "0%, 55%": { backgroundColor: "#dbeee0" },
          "100%": { backgroundColor: "transparent" },
        },
        toastIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drawerIn: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        scrimIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        arrival: "arrival 4s ease-out forwards",
        toastIn: "toastIn 150ms ease-out",
        drawerIn: "drawerIn 200ms ease-out",
        scrimIn: "scrimIn 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
