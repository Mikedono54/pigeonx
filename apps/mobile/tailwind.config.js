/** @type {import('tailwindcss').Config} */
// Mirrors src/theme/tokens.ts. Tailwind's config loader cannot import TS, so
// these values are written out literally. Keep the two files in step.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F5F5F3',
        card: '#FFFFFF',
        elevated: '#EDEDEA',
        border: '#E3E3DF',
        ink: '#0A0A0A',
        fg: {
          DEFAULT: '#1F1F1F',
          muted: '#5F5F5F',
          subtle: '#8A8A8A',
        },
        accent: { DEFAULT: '#2B5CFF', foreground: '#FFFFFF' },
        success: '#0F8A4B',
        warning: '#B26A00',
        danger: '#C62828',
      },
      borderRadius: {
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        pill: '0px',
        DEFAULT: '0px',
        full: '0px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      fontFamily: {
        heading: ['InterTight_600SemiBold'],
        'heading-bold': ['InterTight_700Bold'],
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        mono: ['JetBrainsMono_500Medium'],
      },
    },
  },
  plugins: [],
};
