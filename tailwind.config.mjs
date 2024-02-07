const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Helvetica Neue", ...defaultTheme.fontFamily.sans],
        serif: ["Lusitana", ...defaultTheme.fontFamily.serif],
        display: ["Source Serif Pro", ...defaultTheme.fontFamily.serif],
      },
    },
  },
  plugins: [],
};
