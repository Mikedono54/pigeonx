/** @type {import('tailwindcss').Config} */
// Mirrors src/theme/tokens.ts. Tailwind's config loader cannot import TS, so
// these values are written out literally — keep the two files in step.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B1220',
        surface: '#111A2E',
        card: '#151F36',
        elevated: '#1B2742',
        border: '#243049',
        fg: {
          DEFAULT: '#F1F5F9',
          muted: '#8B97AD',
          subtle: '#5B6881',
        },
        teal: '#2DD4BF',
        blue: '#3B82F6',
        accent: { DEFAULT: '#22D3EE', foreground: '#06121F' },
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        pill: '999px',
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
        heading: ['Outfit_600SemiBold'],
        'heading-bold': ['Outfit_700Bold'],
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        mono: ['JetBrainsMono_500Medium'],
      },
      backgroundImage: {
        brand: 'linear-gradient(135deg, #2DD4BF 0%, #3B82F6 100%)',
      },
    },
  },
  plugins: [],
};
