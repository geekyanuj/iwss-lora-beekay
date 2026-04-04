/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}",
    "node_modules/flowbite-charts/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        fadeIn: "fadeIn 0.3s ease-in-out",
        slideUp: "slideUp 0.4s ease-out",
        slideDown: "slideDown 0.4s ease-out",
        slideIn: "slideIn 0.3s ease-out",
        scaleIn: "scaleIn 0.3s ease-out",
      },
      colors: {
        // Light-themed default colors
      },
    },
  },
  plugins: [
    require("flowbite/plugin"),
    require("flowbite-typography"),
    require("flowbite-charts"),
  ],
};
