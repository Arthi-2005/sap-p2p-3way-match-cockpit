import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sap: {
          blue: "#0A6ED1",
          darkBlue: "#0854A0",
          shellBg: "#354A5F",
          bg: "#F5F7FA",
        },
      },
    },
  },
  plugins: [],
};
export default config;
