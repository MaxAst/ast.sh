const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      animation: {
        marquee: "marquee 15s linear infinite",
      },
      fontFamily: {
        sans: ["Helvetica Neue", ...defaultTheme.fontFamily.sans],
        serif: ["Lusitana", ...defaultTheme.fontFamily.serif],
        display: ["Source Serif Pro", ...defaultTheme.fontFamily.serif],
        special: ["Bauer Bodoni Condensed", ...defaultTheme.fontFamily.serif],
        specialty: [
          "Bauer Bodoni Condensed Bold",
          ...defaultTheme.fontFamily.serif,
        ],
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
      },
    },
  },
  plugins: [],
};
