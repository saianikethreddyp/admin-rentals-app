// Plain Node environment (real fetch) for the optional live-API contract check.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/api/contract.test.ts'],
  transform: { '\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
