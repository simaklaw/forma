// ESLint flat-конфиг для TS-воркспейсов Forma (ревью-находка #4).
// Фаза 2 — recommended-правила блокируют CI (error); исключения в
// WARN_RULES остаются advisory (warn), по фактическим срабатываниям
// из ci-logs/lint-report/lint.log. По мере чистки кода убираем правила
// из WARN_RULES — они автоматически становятся error.
// Mobile не затронут: у него свой eslint 8 + eslint-config-universe.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Правила, временно остающиеся advisory. Пуст — все recommended-правила
// блокирующие; осознанные временные исключения добавлять сюда и убирать
// по мере чистки кода.
const WARN_RULES = new Set<string>([]);

// Recommended-наборы: error по умолчанию, из WARN_RULES — warn
// (off остаётся off).
const toLevel = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, level]) => {
      const lvl = Array.isArray(level) ? level[0] : level;
      if (lvl === 'off') return [name, level];
      const target = WARN_RULES.has(name) ? 'warn' : 'error';
      return [name, Array.isArray(level) ? [target, ...level.slice(1)] : target];
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
      ...toLevel(js.configs.recommended.rules),
      ...toLevel(tsRecommendedRules),
      // Идиома «намеренно не используется»: _-префикс аргументов
      // и rest-siblings в деструктуризации (const { a: _, ...rest } = x).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
);
