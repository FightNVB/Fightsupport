/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "node",
          esModuleInterop: true,
          jsx: "react-jsx",
          strict: true,
          baseUrl: ".",
          paths: {
            "@/*": ["*"],
          },
        },
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: [
    "lib/constants/**/*.ts",
    "lib/auth/**/*.ts",
    "lib/workflow/**/*.ts",
  ],
};

module.exports = config;
