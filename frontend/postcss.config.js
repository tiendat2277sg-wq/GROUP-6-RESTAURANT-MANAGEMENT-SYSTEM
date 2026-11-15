import path from "node:path";
import { fileURLToPath } from "node:url";

// Point Tailwind at this folder's config explicitly. Tailwind v3 otherwise
// looks for tailwind.config.js in the process working directory; when the dev
// server is started from the repo root it silently falls back to an empty
// config and emits no utility classes (flex, p-6, w-5...).
const here = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    tailwindcss: { config: path.join(here, "tailwind.config.js") },
    autoprefixer: {},
  },
};
