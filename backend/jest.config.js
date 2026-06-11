export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  globalTeardown: '<rootDir>/tests/teardown.js',
};
