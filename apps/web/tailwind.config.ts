import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--bg)",
        elevated: "var(--bg-elevated)",
        ink: "var(--text)",
        subtext: "var(--text-secondary)",
        quiet: "var(--text-tertiary)",
        hairline: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          hover: "var(--accent-hover)",
        },
        warm: "var(--warm)",
        "surface-solid": "var(--surface-solid)",
        "surface-soft": "var(--surface-soft)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        code: ["var(--font-code)", "ui-monospace", "monospace"],
      },
      fontWeight: {
        bolder: "750",
        extreme: "850",
      },
      maxWidth: {
        content: "1160px",
        measure: "38rem",
        wide: "44rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 40px rgba(0, 0, 0, 0.06)",
        "card-dark": "0 1px 2px rgba(0, 0, 0, 0.2), 0 12px 40px rgba(0, 0, 0, 0.4)",
        "card-hover":
          "0 1px 2px rgba(0, 0, 0, 0.05), 0 20px 50px rgba(0, 0, 0, 0.08)",
        lift: "0 24px 60px rgba(109, 40, 217, 0.16)",
      },
      borderRadius: {
        "3xl": "1.25rem",
        "4xl": "1.5rem",
        "5xl": "2.5rem",
      },
      animation: {
        "fade-up": "fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "shimmer": "shimmer 2s linear infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
