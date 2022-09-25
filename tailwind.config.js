/** @type {import('tailwindcss').Config} */
const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./pages/**/*.tsx", "./components/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Kollektif", ...fontFamily.sans],
        sans: ["Open Sans", ...fontFamily.sans],
      },
    },
  },
  plugins: [],
};
