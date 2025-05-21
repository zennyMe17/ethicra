import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});


const eslintConfig = [
  // Keep the default Next.js config
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Add this block to override ESLint rules
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",  // <-- This disables the 'any' rule
    },
  },
];

export default eslintConfig;
