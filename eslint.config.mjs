import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([...nextVitals, ...nextTs,
  // Media must bypass Next's shared image cache so moderation revokes new reads immediately.
  { rules: { "@next/next/no-img-element": "off" } },
  globalIgnores([".next/**", ".tools/**", "next-env.d.ts"])]);
