module.exports = {
    "env": {
        "browser": true,
    },
    "extends": [
        "airbnb",
        "airbnb-typescript",
        "airbnb/hooks",
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        },
        "ecmaVersion": 2021,
        "sourceType": "module",
        "project": "tsconfig.json",
    },
    "plugins": [
        "react",
        "@typescript-eslint"
    ],
    "rules": {
        "semi": ["error", "never"]
    }
};