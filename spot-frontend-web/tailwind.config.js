/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        admin: {
          primary: '#004ac6',
          primaryHover: '#0041ad',
          ink: '#191c1e',
          muted: '#434655',
          subtle: '#737686',
          bg: '#f7f9fb',
          border: '#e5e8ec',
          surfaceMuted: '#f2f4f6',
          success: '#047857',
          successBg: '#d1fae5',
          warning: '#d97706',
          warningBg: '#fef3c7',
          warningBorder: '#fffbeb',
          danger: '#ba1a1a',
          dangerBg: '#ffdad6',
          info: '#1d4ed8',
          infoBg: '#dbeafe',
          purple: '#7e22ce',
          purpleBg: '#f3e8ff',
        },
      },
    },
  },
  plugins: [],
}
