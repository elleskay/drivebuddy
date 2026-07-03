import base from "../../eslint.config.base.mjs";

export default [
  ...base,
  {
    // The config file itself is not part of the TS project service.
    ignores: [".expo/**", "android/**", "ios/**", "dist/**", "eslint.config.mjs"],
  },
];
