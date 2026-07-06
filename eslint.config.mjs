// ESLint 9 flat config. eslint-config-next v16 exports flat-config arrays
// directly (no FlatCompat needed). Run: npm run lint
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "next-env.d.ts",
      "prisma/migrations/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // The org-scoped routers strip organizationId/id out of the update
      // payload with `const { id, organizationId, ...data } = input` — those
      // bindings are intentionally unused. Allow that idiomatic pattern and
      // underscore-prefixed throwaways, without disabling the rule wholesale.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default eslintConfig;
