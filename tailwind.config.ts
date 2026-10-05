import type { Config } from "tailwindcss"

// Token names are kept stable across redesigns; DESIGN.md documents their role.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#16132a",
        "primary-deep": "#0d0b1a",
        "on-primary": "#fbf7ef",
        ink: "#1f1b16",
        "ink-mute": "#6b645a",
        "ink-faint": "#a39b8e",
        canvas: "#fffdf8",
        "canvas-soft": "#f6f1e7",
        "surface-violet-soft": "#f2c14e",
        "surface-teal-deep": "#123b36",
        "surface-teal-mid": "#1c5a52",
        hairline: "#e7dfd0",
        "hairline-dark": "#3a3555",
        "on-dark-mute": "#c9c3da",
        "fn-tonic": "#1f8a70",
        "fn-subdominant": "#c98a14",
        "fn-dominant": "#d4462b",
        "fn-borrowed": "#7b5cd6",
        "fn-chromatic": "#6b7280",
      },
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31, 27, 22, 0.06), 0 8px 24px rgba(31, 27, 22, 0.06)",
      },
    },
  },
  plugins: [],
}

export default config
