import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve content globs from this file's folder, not from the process working
// directory. When Vite/PostCSS ran from another folder the relative globs matched
// nothing, so every Tailwind utility class (flex, p-6, w-5...) was dropped.
const here = path.dirname(fileURLToPath(import.meta.url));
const fromHere = (p) => path.join(here, p).replace(/\\/g, "/");

export default {
  content: [
    fromHere("index.html"),
    fromHere("src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-up': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '15%': { transform: 'rotate(-10deg)' },
          '30%': { transform: 'rotate(10deg)' },
          '45%': { transform: 'rotate(-8deg)' },
          '60%': { transform: 'rotate(8deg)' },
          '75%': { transform: 'rotate(-4deg)' },
          '90%': { transform: 'rotate(4deg)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-up': 'scale-up 0.2s ease-out',
        'wiggle': 'wiggle 0.8s ease-in-out infinite'
      }
    },
  },
  plugins: [],
}
