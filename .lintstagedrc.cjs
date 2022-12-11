module.exports = {
  "*.{tsx,ts}": [
    "eslint --cache --fix --max-warnings=0 --rule 'no-console: error'",
    "prettier --write",
  ],
  "*.{js,cjs,mjs,json}": ["prettier --write"],
};
