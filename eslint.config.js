import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      // BIXBO intentionally colocates small helpers/constants with route and UI
      // components. Fast-refresh export shape is therefore not a correctness
      // signal for this project; real hook correctness remains enforced below.
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "no-constant-binary-expression": "warn",
      "no-misleading-character-class": "error",
      "no-extra-boolean-cast": "warn",
      "no-empty": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    // Notes is intentionally deferred from this audit pass. Keep its existing
    // autosave implementation unchanged until the dedicated Notes refactor.
    files: ["src/routes/notes.tsx", "src/routes/notes-editor.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
  eslintPluginPrettier,
  // Must come after prettier recommended so it overrides prettier/prettier: error
  {
    rules: {
      "prettier/prettier": "off",
    },
  },
);
