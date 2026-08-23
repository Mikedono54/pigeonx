// Jest only transforms .js, .ts and .tsx. The icon set's react-native entry is
// an .mjs bundle, so a test that renders an icon cannot parse it. Node's own
// resolver picks the CommonJS build of the same icons, which tests can read.
const lucideCjs = require.resolve('lucide-react-native');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets|nativewind|react-native-css-interop|lucide-react-native|react-native-audio-api))',
  ],
  moduleNameMapper: {
    '\\.(wav|mp3|m4a)$': '<rootDir>/__mocks__/assetMock.js',
    '^lucide-react-native$': lucideCjs,
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
};
