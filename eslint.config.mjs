// ESLint flat-конфиг для TS-воркспейсов Forma (ревью-находка #4).
// Фаза 1 — «подсвечиваем, не блокируем»: все правила в warn.
// По мере чистки кода переносим правила в error и расширяем набор.
// Mobile не затронут: у него свой eslint 8 + eslint-config-universe.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Все правила recommended-наборов понижаются до warn (off остаётся off):
// линт даёт сигнал в логах, но не блокирует CI.
const toWarn = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, level]) => {
      const lvl = Array.isArray(level) ? level[0] : level;
      if (lvl === 'off') return [name, level];
      return [name, Array.isArray(level) ? ['warn', ...level.slice(1)] : 'warn'];
    }),
  );

const tsRecommendedRules = Object.fromEntries(
  tseslint.configs.recommended.flatMap((cfg) => Object.entries(cfg.rules ?? {})),
);

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/*.gen.ts',
      '**/*.gen.js',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      ...toWarn(js.configs.recommended.rules),
      ...toWarn(tsRecommendedRules),
    },
  },
);
