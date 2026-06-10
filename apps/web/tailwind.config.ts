import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // StreamZ brand colors
        brand: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        // Dark theme surface colors
        surface: {
          DEFAULT: '#0f0f13',
          50: '#1a1a24',
          100: '#16161e',
          200: '#1e1e2a',
          300: '#262636',
          400: '#2e2e42',
        },
        accent: {
          twitch: '#9146FF',
          youtube: '#FF0000',
          instagram: '#E4405F',
          tiktok: '#00F2EA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(236, 72, 153, 0.2), 0 0 20px rgba(236, 72, 153, 0.1)' },
          '100%': { boxShadow: '0 0 10px rgba(236, 72, 153, 0.4), 0 0 40px rgba(236, 72, 153, 0.2)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
