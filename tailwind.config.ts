import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1b1938",
        "primary-deep": "#0e0c1f",
        "on-primary": "#ffffff",
        ink: "#292827",
        "ink-mute": "#73706d",
        "ink-faint": "#9a9794",
        canvas: "#ffffff",
        "canvas-soft": "#fafaf8",
        "surface-violet-soft": "#c9b4fa",
        "surface-teal-deep": "#0e3030",
        "surface-teal-mid": "#155555",
        hairline: "#e8e4dd",
        "hairline-dark": "#3f3a52",
        "on-dark-mute": "#bcbac9",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}

export default config
