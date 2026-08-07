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
        sidebar: "#FFF5F2", // pale sidebar/brand-panel surface, matches clinvedica.com
        brand: {
          DEFAULT: "#A32626", // Clin Vedica brand red -- primary actions
          50: "#FBEAEA",
          100: "#F3D2D1",
          400: "#C97575",
          600: "#8A1F1F",
          700: "#7A1B1B",
          amber: "#A15E0C", // gradient endpoint, matches clinvedica.com CTA button
        },
        amber: {
          DEFAULT: "#B8763B", // secondary accent, used sparingly -- eosin stain
          50: "#F8EFE4",
          100: "#EFDBC0",
          600: "#8F5A28",
        },
        line: "#DEDFDA", // hairline borders
        success: "#3E7A4D",
        danger: "#C2540E",
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
