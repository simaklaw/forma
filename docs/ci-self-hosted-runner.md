# CI на self-hosted runner

## Зачем

На аккаунте стоят бюджеты $0.00 (Actions, Codespaces, Packages, LFS) — GitHub-hosted джобы заблокированы.
Джобы на **self-hosted runner бесплатны** и не проходят через бюджет: минута использования = $0.

## Установка раннера (Linux x64 / WSL2)

1. Репозиторий → **Settings → Actions → Runners → New self-hosted runner → Linux x64**.
2. Скопируйте команды со страницы (токен живёт 1 час):

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-*.tar.gz -L https://github.com/actions/runner/releases/download/<версия>/actions-runner-linux-x64-<версение>.tar.gz
tar xzf actions-runner-linux-x64-*.tar.gz
./config.sh --url https://github.com/simaklaw/forma --token <TOKEN>
```

3. Запуск:

```bash
./run.sh                 # интерактивно
# или как служба:
sudo ./svc.sh install && sudo ./svc.sh start
```

Требования к машине: git, curl, tar. Node 22 и pnpm 9.15 workflow ставит сам
(actions/setup-node, pnpm/action-setup). Сборка целиком идёт в каталоге раннера
(`_work/forma/...`), кэш pnpm хранится локально — повторные прогоны быстрее GitHub-hosted.

### Windows

Нативный раннер возможен, но workflows написаны под bash (set -o pipefail, функции),
а DeepSeek CR использует python3. Поэтому для Windows рекомендуется **WSL2**:
установить раннер внутри WSL — он будет Linux-раннером, всё работает из коробки.

## Безопасность (репозиторий публичный!)

Self-hosted runner выполняет код workflows на вашей машине. Для публичного репо это риск:
любой PR из форка мог бы запустить произвольный код на вашем компьютере. Поэтому:

- в `ci.yml` и `deepseek-review.yml` стоит guard-условие: джобы **не запускаются**
  для PR из форков (`github.event.pull_request.head.repo.full_name == github.repository`);
- запускайте раннер от отдельного непривилегированного пользователя (не от admin/root
  и не от вашего основного аккаунта);
- никогда не добавляйте `pull_request_target` с checkout кода из форка.

## Порядок включения

1. Установить и запустить раннер (см. выше), убедиться, что он `Idle` в
   Settings → Actions → Runners.
2. Влить PR с переключением `runs-on: ubuntu-latest` → `runs-on: self-hosted`.
3. Следующий push/PR запустит CI уже на вашей машине.

Пока раннер не установлен, НЕ переключайте runs-on: джобы зависнут в очереди.
