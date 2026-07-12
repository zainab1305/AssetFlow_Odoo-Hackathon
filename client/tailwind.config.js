export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        panel: '#0b1220',
        shell: '#f4f7fb',
        accent: '#19b5a5',
        accent2: '#f59e0b',
      },
      boxShadow: {
        soft: '0 20px 50px rgba(15, 23, 42, 0.12)',
      },
      backgroundImage: {
        'hero-radial': 'radial-gradient(circle at top right, rgba(25, 181, 165, 0.18), transparent 35%), radial-gradient(circle at bottom left, rgba(245, 158, 11, 0.16), transparent 28%)',
      },
    },
  },
  plugins: [],
};