# Тандем агентов: Grok + Gemini + Free Claude Code

Кто что делает на FitPulse/Forma:

| Агент | Роль |
|-------|------|
| **Grok (этот чат)** | Оркестрация, PR, CI, архитектура, Health Connect, domain |
| **Gemini CLI / Code Assist** | Быстрые правки UI, генерация стилей, альтернативный взгляд на diff |
| **Free Claude Code** | Глубокий рефакторинг, сложные TS, тесты — когда нужен «сильный» кодер |
| **DeepSeek CR (Actions)** | Авто-ревью каждого PR (OpenRouter / DeepSeek key) |

## Как работать с телефона

1. Grok открывает ветку + PR.
2. DeepSeek CR комментирует PR автоматически.
3. При необходимости: в Codespaces / локально `gemini` или Free Claude Code на том же diff.
4. Правки — обратно в ту же ветку; CI должен остаться зелёным.
5. Merge только при зелёном **Monorepo CI**.

## Не смешивать

- Не коммитить API-ключи.
- Не собирать APK без явной команды владельца.
- Health sync — только **Health Connect**, не Google Fit.
