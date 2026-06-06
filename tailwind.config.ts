import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        byt: {
          ink: "#17211b",
          muted: "#637066",
          line: "#dce4dc",
          surface: "#ffffff",
          leaf: "#326b4f",
          herb: "#7aa37b",
          clay: "#b85f4c",
          morning: "#d8a24b",
          blue: "#385f7d"
        }
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 33, 27, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
