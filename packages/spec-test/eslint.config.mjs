import base from "../../eslint.config.base.mjs";

export default [
  ...base,
  {
    // CLI entry points report to the terminal by design.
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/**", "samples/**", "eslint.config.mjs"],
  },
];
