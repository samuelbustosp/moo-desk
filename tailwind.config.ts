import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        moo: {
          bg: "var(--moo-bg, #09090b)",
          elevated: "var(--moo-elevated, #121215)",
          secondary: "var(--moo-secondary, #18181b)",
          text: "var(--moo-text, #fafafa)",
          muted: "var(--moo-muted, #a1a1aa)",
          border: "var(--moo-border, #27272a)",
          accent: "rgb(var(--moo-accent-rgb, 245 158 11) / <alpha-value>)",
          "accent-hover":
            "rgb(var(--moo-accent-hover-rgb, 251 191 36) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: [
          "'Momo Trust Display'",
          "var(--font-geist-sans)",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
