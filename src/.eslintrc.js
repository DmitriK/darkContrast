module.exports = {
  "env": {
    "browser": true,
    "webextensions": true,
    "es6": true
  },
  "extends": "eslint:all",
  "rules": {
    "camelcase": "warn",
    "capitalized-comments": "off",
    "comma-dangle": ["warn", "always-multiline"],
    "eqeqeq": ["error", "smart"],
    "func-style": "off",
    "func-names": ["warn", "as-needed"],
    "id-length": "off",
    "indent": ["error", 2],
    "key-spacing": ["warn", { "align": "value" }],
    "lines-around-directive": ["error", { "before": "never", "after": "always" }],
    "max-statements": "off",
    "newline-after-var": "warn",
    "newline-before-return": "warn",
    "no-console": "warn",
    "no-eq-null": "off",
    "no-implicit-globals": "off",
    "no-magic-numbers": "off",
    "no-mixed-operators": "off",
    "no-underscore-dangle": "off",
    "no-use-before-define": "warn",
    "object-property-newline": ["warn", {
      "allowMultiplePropertiesPerLine": true
    }],
    "one-var": ["error", "never"],
    "padded-blocks": ["error", "never"],
    "prefer-arrow-callback": "warn",
    "prefer-const": "warn",
    "prefer-destructuring": "warn",
    "quote-props": ["warn", "consistent-as-needed"],
    "quotes": ["warn", "single"],
    "require-jsdoc": "off",
    "sort-keys": "off",
    "space-before-function-paren": ["error", {
      "anonymous": "always",
      "named": "never",
      "asyncArrow": "always"
    }],
    "strict": ["error", "global"],
  }
};
