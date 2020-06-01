module.exports = {
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transform: {
    "\\.tsx?$": "ts-jest",
  },
  testMatch: ["**/tests/**/*"],
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json",
    },
  },
  moduleNameMapper: {
    "@bedsheets/(.*)$": "<rootDir>/packages/$1",
  },
}
