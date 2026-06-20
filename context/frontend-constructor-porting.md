# Портирование live-фронта в Studio-конструктор

Дата: 2026-06-20

## Два параллельных фронта

1. **CMS (`site.yaml`)** — `PageRenderer` + `SiteLayout` + `BLOCK_REGISTRY`. Только у `default`.
2. **Wizard (`wizard/*.yaml`)** — `WizardPage` + `WizardEngine` + hardcoded React (Strela vs generic). У всех профилей.

Профиль задаёт: theme, branding (layoutVariant, colors), wizard YAML, algorithm. `site.yaml` — опционально.

## Профили

| profileId | layoutVariant | Wizard UI | site.yaml |
|-----------|---------------|-----------|-----------|
| default | strela-funnel | Strela funnel + charts | да (5 страниц) |
| acme-industrial | topbar-dark | generic CardGrid | нет |
| nord-minimal | minimal-light | generic | нет |
| aqua-pro | sidebar-gradient | generic | нет |

## Цель порта

Каждый визуальный фрагмент live UI → блок конструктора с семантикой HTML (section, header, nav, article, figure, form…).

## Фазы

1. CMS: довести блоки до parity с SiteLayout + контентные секции
2. Wizard shell: layout-блоки (sidebar, topbar, funnel-header)
3. Wizard steps: step-card-grid, step-selection-form как блоки с preview
4. Экспорт site.yaml для acme/nord/aqua
5. Login/cabinet — отдельные шаблоны или вне scope

## Файлы

- Live blocks: `apps/web/src/blocks/`
- Studio schema: `apps/web/src/routes/admin/studio/properties/blockSchema.ts`
- Wizard: `apps/web/src/engines/WizardEngine.tsx`, `components/strela/`, `components/wizard/`
- Layout: `apps/web/src/components/layout/variants/`, `engine/SiteLayout.tsx`
