import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

// Raw colours and pixel values must come from design tokens (plan B2-B5).
const RAW_COLOUR = String.raw`^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$`;
const RAW_PX = String.raw`^-?\d+(\.\d+)?px$`;

// Screens use design-system wrappers, never these MUI components directly (ADR-0003).
const WRAPPED_MUI = [
  "Alert",
  "Button",
  "Checkbox",
  "Chip",
  "Dialog",
  "Drawer",
  "IconButton",
  "OutlinedInput",
  "Radio",
  "Select",
  "Snackbar",
  "Switch",
  "Tab",
  "Tabs",
  "TextField",
];

export default defineConfig([
  globalIgnores(["dist", "playwright-report", "test-results", "node_modules"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/design-system/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=/${RAW_COLOUR}/]`, message: "Use a colour token from the design system, not a raw hex value." },
        { selector: `Literal[value=/${RAW_PX}/]`, message: "Use spacing/size tokens (theme.spacing or tokens), not raw px values." },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@mui/material",
              importNames: WRAPPED_MUI,
              message: "Import the design-system wrapper from '@/design-system' instead (ADR-0003).",
            },
          ],
          patterns: [
            {
              group: WRAPPED_MUI.map((name) => `@mui/material/${name}`),
              message: "Import the design-system wrapper from '@/design-system' instead (ADR-0003).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["e2e/**/*.ts", "*.config.ts"],
    languageOptions: { globals: globals.node },
  },
]);
