module.exports = {
  "env": {
    "browser": true,
    "webextensions": true,
    "es6": true
  },
  "extends": "eslint:recommended",
  "rules": {
    "arrow-parens": "error",
    "comma-dangle": ["warn", "always-multiline"],
    "consistent-return": "error",
    "eqeqeq": ["error", "smart"],
    "func-names": ["warn", "as-needed"],
    "indent": ["error", 2],
    "init-declarations": "error",
    "key-spacing": ["warn", { "align": "value" }],
    "linebreak-style": ["error", "unix"],
    "newline-after-var": "warn",
    "newline-before-return": "warn",
    "no-console": "warn",
    "no-else-return": "error",
    "no-extra-parens": "warn",
    "no-plusplus": "error",
    "no-trailing-spaces": "error",
    "no-undefined": "error",
    "no-use-before-define": "warn",
    "no-var": "error",
    "object-property-newline": ["warn", {
      "allowMultiplePropertiesPerLine": true
    }],
    "object-shorthand": "error",
    "one-var": ["error", "never"],
    "prefer-arrow-callback": "warn",
    "prefer-const": "warn",
    "prefer-destructuring": "warn",
    "quote-props": ["warn", "consistent-as-needed"],
    "quotes": ["warn", "single"],
    "radix": "error",
    "semi": ["error", "always"],
    "space-before-function-paren": ["error", {
      "anonymous": "always",
      "named": "never",
      "asyncArrow": "always"
    }],
    "spaced-comment": "error",
  }
};
