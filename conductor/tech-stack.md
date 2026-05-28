# Tech Stack

| Слой | Технология | Примечание |
|------|------------|------------|
| Frontend | React 18, Vite 6, TypeScript | Как референс 159.194.215.53 |
| Routing | Wouter | Лёгкий роутер |
| State | Zustand | Состояние визарда и формы |
| UI | Radix + Tailwind CSS 4 | shadcn-совместимые примитивы |
| Icons | lucide-react | |
| Config | YAML + JSON Schema | Валидация визарда |
| Backend | Python 3.12, FastAPI | Алгоритмы, PDF, API |
| ORM | SQLAlchemy 2 (async) | Через адаптеры БД |
| PDF | Jinja2 + (WeasyPrint или reportlab) | Плагинные шаблоны |
| Monorepo | pnpm workspaces | apps + packages |
| Deploy | Docker Compose | web + api + postgres |

## Переменные окружения

См. `.env.example` в корне.
