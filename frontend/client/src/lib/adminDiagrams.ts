/**
 * Тексты Mermaid для админ-панели. Синхронизировать с кодом при изменении пайплайнов.
 */

/** Пайплайн PDF спецификации станции (основной путь production). */
export const PDF_PIPELINE_MERMAID = `flowchart TD
  subgraph CL["Клиент"]
    BTN["Скачать PDF"]
    PNG["Снимок графиков с экрана"]
    REQ["POST /api/download_station_pdf + FormData"]
  end
  subgraph VW["views.download_station_pdf"]
    C["_calc_station_result → комплектация"]
    N["Нормализация parsed + equipment_data"]
    CH["Точки характеристик насоса из БД для таблицы"]
  end
  subgraph PGpdf["pdf_generator.PDFGenerator"]
    S1["Лист 1: фон + номер ТКП"]
    S2["Лист 2: КП на фоне second_page"]
    S3["Лист 3: фон third_page, схема, таблица DataParser, график поверх"]
    S4["Лист last: готовый last_page.pdf"]
    M["PyPDF2 PdfMerger: 1+2+3+4"]
  end
  BTN --> REQ
  PNG --> REQ
  REQ --> C --> N
  C --> S1
  C --> S2
  N --> CH --> S3
  S1 --> M
  S2 --> M
  S3 --> M
  S4 --> M`;

/** Высокоуровневая структура SPA (client/src). */
export const WEB_CLIENT_STRUCTURE_MERMAID = `flowchart TB
  subgraph EN["Вход"]
    M["main.tsx"]
    R["App.tsx: Router, Query, Auth"]
  end
  subgraph PG["pages"]
    HM["Home — конфигуратор"]
    CB["Cabinet — подборы, проекты"]
    AD["AppAdmin — встроен в Cabinet для admin"]
    LG["Login / Register / not-found"]
  end
  subgraph LB["lib"]
    AP["api.ts — запросы к Django"]
    AU["auth — сессия пользователя"]
    CF["csrf"]
  end
  subgraph CM["components"]
    LO["layout: Header и др."]
    FM["формы поиска и результаты"]
    ADM["admin: Mermaid-диаграммы"]
  end
  M --> R
  R --> HM
  R --> CB
  R --> LG
  CB --> AD
  HM --> AP
  HM --> CM
  AD --> AP
  R --> AU`;
