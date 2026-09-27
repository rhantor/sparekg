import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // tsc output of the Cloud Functions package — lint its src/, not the build.
    "functions/lib/**",
    // Throwaway Admin SDK probes (CommonJS, gitignored).
    "scratchpad/**",
  ]),
  // CommonJS scripts (the emulator e2e suite and seeders) load with require by definition.
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
