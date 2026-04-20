import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['en', 'ja'],
  extract: {
    input: ['src/**/*.{js,jsx,ts,tsx}'],
    output: 'src/functions/multilingual/locales/{{language}}/{{namespace}}.json',
    defaultNS: 'common',
  },
});