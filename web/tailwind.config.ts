import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ai: {
          kimi: '#111827',
          chatglm: '#3477F1',
          claude: '#D97757',
          gemini: '#1C70F3',
          deepseek: '#4D6BFE',
          chatgpt: '#10A37F',
          qwen: '#604BE8',
          doubao: '#04D1AB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [typography],
} satisfies Config

