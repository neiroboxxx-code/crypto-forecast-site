# Project Ecosystem Map

Дата: 2026-04-23  
Хост: macOS (локальные абсолютные пути)

Ниже — обзор трёх основных директорий и того, как они связаны в единую систему.

## Директории верхнего уровня

- **`/Users/kirill/btc_reversal_project`**: Python/engine + FastAPI API-гейтвей для данных (reversal/micro) и пайплайн отчётности.
- **`/Users/kirill/crypto-trading-platform`**: «зонтичный» репозиторий: документация + **frontend (`site/`)** + backend-оркестрация/хранилище (`system/`).
- **`/Users/kirill/claud`**: рабочая «вики/архив» (Obsidian docs), артефакты, и экспериментальные сервисы (Node/Python).

## 1) `/Users/kirill/btc_reversal_project`

### Дерево (фильтр: без `.git`, `node_modules`, `__pycache__`, `.venv/venv`, `.next`)

```text
/Users/kirill/btc_reversal_project/
├── api/
│   ├── routes/
│   │   ├── micro.py
│   │   └── reversal.py
│   ├── cache.py
│   └── server.py
├── data/
│   ├── debug/
│   ├── input/
│   ├── output/
│   └── bybit_fetcher.py
├── docs/
│   ├── cursor_reports/
│   ├── fixed_workflow/
│   ├── gemini_dock_migration/
│   ├── project_dokementation/
│   └── report_jobs_dun_GPT/
├── reporting/
│   ├── llm_client.py
│   ├── payload_builder.py
│   └── prompts.py
├── reports/
│   └── reversal_report_20260417_1251.md
├── reversal_engine/
│   ├── anatomy.py
│   ├── context_analyzer.py
│   ├── feature_calculator.py
│   ├── historical_mode.py
│   ├── renderer.py
│   ├── reversal_detector.py
│   ├── scorer.py
│   ├── schemas.py
│   ├── structure_detector.py
│   ├── validators.py
│   └── zone_builder.py
├── scripts/
│   ├── find_forward_candidate.py
│   └── run_local_engine.py
├── tests/
├── README.md
├── requirements.txt
└── split_pdfs.py
```

### Ответственности (по смыслу структуры)

- **`api/server.py` + `api/routes/*`**: FastAPI API (эндпоинты для данных micro/reversal), который читает/кеширует результаты движков и отдаёт UI.
- **`reversal_engine/*`**: ядро логики разворотного движка (анализ контекста, детекторы, скоринг, форматтеры).
- **`reporting/*` + `reports/`**: слой генерации отчётов, LLM-промпты/клиент, сборка payload.
- **`data/input|output|debug`**: тестовые/временные JSON и артефакты валидации.
- **`split_pdfs.py`**: утилита локальной нарезки PDF в `slide-*.jpg` (для фронтенд-галерей в `site/public/*`).

## 2) `/Users/kirill/crypto-trading-platform`

### Дерево (верхний уровень)

```text
/Users/kirill/crypto-trading-platform/
├── .cursor/
├── docs/
├── site/
├── system/
└── repomix-output.xml
```

### 2.1 `site/` — Frontend (Next.js 14/16 App Router)

Это текущий UI/UX-дэшборд: вкладки **Dashboard / Academy / Paperbot**.

Ключевые места:

- **Роутинг**: `site/app/*`
  - `site/app/page.tsx` — главный дэшборд
  - `site/app/academy/page.tsx` — Академия (таб-UI, компактные карточки, модалка-карусель)
  - `site/app/paperbot/page.tsx` — Пейпербот (моки)
- **UI-слои**: `site/components/*`
  - `layout/` — shell + навигация вкладок
  - `sections/` — виджеты (включая `chart-panel.tsx` с TradingView)
  - `sections/academy/academy-dashboard.tsx` — табы + компактные карточки + полноэкранный lightbox
- **Данные**:
  - `site/lib/api.ts` — клиент API (ожидает бекенд, обычно на `localhost:8000`)
  - `site/data/latest-signal.json`, `site/data/latest-news.json` — локальные снапшоты/примеры
- **Материалы Академии**: `site/public/*`
  - Папки с `slide-*.jpg` и исходными PDF (PDF намеренно игнорируются в UI; UI грузит только `slide-*.jpg`).

### 2.2 `system/` — backend-пайплайн/оркестрация + хранилище

```text
/Users/kirill/crypto-trading-platform/system/
├── collectors/                # сборщики данных (Bybit/News/др.)
├── features/                  # фичи/сигналы
├── models/                    # predictor/result_checker
├── scripts/                   # build_site_export.py / push_site_data.py / run_and_update_site.sh
├── storage/                   # database.py
├── data/
│   ├── reports/               # множество txt отчётов (история)
│   ├── site_export/           # JSON экспорт для фронта
│   ├── *.db                   # sqlite базы
│   └── *.log                  # launchd/alerts логи
└── main.py                    # входная точка пайплайна
```

Смысл `system/`: запуск пайплайна → генерация JSON в `data/site_export/` → доставка в `crypto-trading-platform/site/data/` (или аналогичный путь) → фронтенд показывает результаты.

## 3) `/Users/kirill/claud`

### Дерево (основное)

```text
/Users/kirill/claud/
├── backend_node/              # небольшой Node backend (routes: historical/news/reversal/signal)
├── services_python/           # вспомогательные python-скрипты (forecast/reversal)
├── docs/                      # Obsidian-хранилище (архив, аудиты, планы, сессии)
├── frontend_react/            # заметки/скелет react (README)
├── .claude/                   # локальные настройки
├── README.md
└── run_pipeline.sh
```

Роль `claud/` в экосистеме выглядит как:
- **документация/планирование/аудиты** (основной объём — `docs/`);
- **экспериментальные/промежуточные сервисы** (Node/Python), которые могли предшествовать текущей связке `btc_reversal_project` + `crypto-trading-platform/system` + `crypto-trading-platform/site`.

## Как всё связано (схема потока)

```text
Данные (биржа/новости)
   ↓
crypto-trading-platform/system (collectors → features/models → scripts)
   ↓ (экспорт JSON)
crypto-trading-platform/site/data  +  public/* (slides)
   ↓
crypto-trading-platform/site (Next.js UI)
   ↕ (по API)
btc_reversal_project/api (FastAPI: micro/reversal)
```

Практически:
- UI (`crypto-trading-platform/site`) запрашивает `health/micro/reversal` и показывает дашборд/сигналы.
- Академия (`site/public/*`) — статический контент (картинки `slide-*.jpg`), который можно генерировать скриптом `btc_reversal_project/split_pdfs.py`.

## Точки запуска (как обычно «поднять» систему локально)

Ниже — **найденные по структуре** entrypoints/скрипты. Это не «единый правильный» способ, но хороший ориентир.

### Frontend (Next.js UI)

- **Проект**: `crypto-trading-platform/site/`
- **Dev сервер**:

```bash
cd /Users/kirill/crypto-trading-platform/site
npm run dev
```

- **Production build**:

```bash
cd /Users/kirill/crypto-trading-platform/site
npm run build
npm run start
```

### API (FastAPI) — данные для UI (micro/reversal)

- **Проект**: `btc_reversal_project/`
- **Entry**: `btc_reversal_project/api/server.py` (роуты в `btc_reversal_project/api/routes/`)
- **Команда (типично для FastAPI)**:

```bash
cd /Users/kirill/btc_reversal_project
# если есть venv:
source venv/bin/activate
uvicorn api.server:app --reload --port 8000
```

UI ожидаемо ходит на `http://localhost:8000` (например, `/health`), если не перенастроено в `site/lib/api.ts`.

### Backend/оркестрация/экспорт данных (пайплайн)

- **Проект**: `crypto-trading-platform/system/`
- **Главные entrypoints (по именам файлов)**:
  - `system/main.py` — входная точка пайплайна
  - `system/run_pipeline.sh` — shell-обёртка запуска
  - `system/scripts/run_and_update_site.sh` — end-to-end: прогон → экспорт → обновление данных для фронта
  - `system/scripts/build_site_export.py` — сбор JSON экспорта
  - `system/scripts/push_site_data.py` — доставка/пуш данных в `site/`

Поскольку это backend-часть, точные флаги/переменные окружения лучше смотреть прямо в этих файлах.

### Движок разворотов (локальный прогон без API)

- **Проект**: `btc_reversal_project/`
- **Потенциальные entrypoints (по структуре)**:
  - `btc_reversal_project/reversal_engine/main.py`
  - `btc_reversal_project/scripts/run_local_engine.py`

### Утилиты для Академии (нарезка PDF → slide-*.jpg)

- **Проект**: `btc_reversal_project/`
- **Скрипт**: `btc_reversal_project/split_pdfs.py`
- **Запуск (пример)**:

```bash
cd /Users/kirill/btc_reversal_project
source venv/bin/activate
python3 split_pdfs.py
```

Скрипт пишет `slide-*.jpg` в папки внутри `crypto-trading-platform/site/public/*`, а UI Академии **загружает только** `slide-*.jpg` (PDF игнорируется).

### Документация / архив (Obsidian)

- **Проект**: `claud/`
- Основная часть — `claud/docs/` (похоже на Obsidian vault). Запуск зависит от выбранного редактора/приложения (обычно Obsidian).

## Подозрительные дубликаты / «мусор» / что можно чистить (аккуратно)

Ниже — кандидаты на уборку **по внешним признакам** (не удалял, только отмечаю).

### Явный мусор/шум
- **`/Users/kirill/crypto-trading-platform/.DS_Store`**: системный файл macOS — можно удалять.

### Большие артефакты, которые часто становятся «балластом»
- **`repomix-output.xml`** встречается в нескольких местах (например, `btc_reversal_project/repomix-output.xml`, `crypto-trading-platform/repomix-output.xml`):
  - Если это временный экспорт/дамп для ревью — можно хранить вне репозитория или в `docs/artifacts/`.
- **`crypto-trading-platform/system/.venv_migrated_backup/`**:
  - Похоже на бэкап виртуального окружения; обычно его **не хранят** в репозитории и можно удалить/вынести в архив, если уже не нужен.

### Логи/исторические отчёты, которые разрастаются
- **`crypto-trading-platform/system/data/reports/`**: огромный набор `report_*.txt` — вероятно, архив.  
  Если отчёты не нужны для продукта, лучше:
  - архивировать (zip),
  - хранить отдельно (S3/диск),
  - или ограничить retention.
- **`crypto-trading-platform/system/data/*stdout.log`, `*stderr.log`, `alerts_*.log`, `launchd_*.log`**:
  - кандидаты на ротацию/retention, иначе папка разрастается.

### Базы данных / бэкапы
- **`crypto-trading-platform/system/data/*.db`** и особенно файлы вида `*_before_* .db`:
  - хранить стоит осознанно (это данные), но для репозитория это часто «лишнее».

### Копии документов
- В `claud/` есть файлы вида `lmm_expert — копия.md`, `… копия 2.md`, `… копия 3.md`:
  - вероятные дубликаты, можно слить/удалить лишнее после проверки.

## Рекомендации по наведению порядка (безопасно)

- **Стандартизировать роли**:
  - `btc_reversal_project` = движок + API (FastAPI).
  - `crypto-trading-platform/system` = оркестрация + экспорт.
  - `crypto-trading-platform/site` = Next.js UI.
  - `claud` = знания/архив/эксперименты.
- **Убрать из git** (если там лежит):
  - виртуальные окружения, `.DS_Store`, массивные логи, временные дампы `repomix-output.xml`.
- **Оформить явный контракт экспорта**:
  - где лежат итоговые JSON для UI (`system/data/site_export/` → `site/data/`), и кто/чем пушит.

