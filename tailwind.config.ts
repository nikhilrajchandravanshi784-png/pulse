import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pulseNavy: "#101A45",
        pulseTeal: "#087F8C",
        pulseBg: "#DCE8EC",
        pulseMint: "#D5F3E7",
        pulseBorder: "#C9D7DE",
        pulseMuted: "#52616B",
        pulseText: "#101A45",
        pulseErrorBg: "#FCE7EB",
        pulseErrorText: "#B4233B",
        pulse: {
          50: "#D5F3E7",
          100: "#B8EAD7",
          200: "#80D4BC",
          300: "#48BFA0",
          400: "#1EAA87",
          500: "#087F8C",
          600: "#076D78",
          700: "#065A63",
          800: "#05474F",
          900: "#101A45",
          950: "#0A102C",
        },
        navy: {
          850: "#182766",
          900: "#101A45",
          950: "#0A102C",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
