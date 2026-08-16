/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true
      }
    ]
  },
  moduleFileExtensions: ["ts", "js"],
  // Exclude the language tests so that Jest doesn't think
  // that the snapshot files belong to Jest and are obsolete.
  testPathIgnorePatterns: ["^<rootDir>/language/"]
};
