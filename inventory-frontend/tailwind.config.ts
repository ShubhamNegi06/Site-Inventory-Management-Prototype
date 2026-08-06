import type { Config } from "tailwindcss";

// Design tokens -- see DESIGN.md for the reasoning behind these choices.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#16232E", // primary text, sidebar surface
          50: "#EEF1F3",
          100: "#DADFE4",
          400: "#5B6B78",
          600: "#33424F",
          700: "#233240",
          900: "#0F1922",
        },
        paper: "#F3F4F1", // app background -- cool neutral, not cream
        panel: "#FFFFFF", // card/table surface
        slate: {
          DEFAULT: "#2B5F5A", // primary brand / actions -- lab-glass teal
          50: "#EAF1F0",
          100: "#D2E2E0",
          400: "#4C8580",
          600: "#234E4A",
          700: "#1B3E3B",
        },
        amber: {
          DEFAULT: "#B8763B", // secondary accent, used sparingly -- eosin stain
          50: "#F8EFE4",
          100: "#EFDBC0",
          600: "#8F5A28",
        },
        line: "#DEDFDA", // hairline borders
        success: "#3E7A4D",
        danger: "#B4443A",
        dangerSoft: "#F6E4E1",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        lg: "8px",
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgba(22, 35, 46, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
