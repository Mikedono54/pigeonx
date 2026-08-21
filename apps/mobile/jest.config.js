/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-worklets|nativewind|react-native-css-interop|lucide-react-native|react-native-audio-api))',
  ],
  moduleNameMapper: {
    '\\.(wav|mp3|m4a)$': '<rootDir>/__mocks__/assetMock.js',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
};
