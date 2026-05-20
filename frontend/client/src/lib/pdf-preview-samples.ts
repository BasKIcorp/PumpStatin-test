/** Образцы данных для визуального конструктора PDF (как в сгенерированном документе). */

export type PdfPreviewTexts = Record<string, string | undefined>;

export type PdfPreviewOptions = {
  /** Число подборов в пакете ТКП для превью (1 — одна строка в таблице КП, без сводной таблицы). */
  selectionCount?: number;
};

const DEFAULTS: Record<string, string> = {
  pump_installation_title: "Насосная установка циркуляции",
  commercial_offer_prefix: "КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ",
  price_on_request: "по запросу",
  executor_body:
    "Исполнитель:\nООО «Спарта»\nИНН 526047883517\nРоссия, 603000, г. Нижний Новгород, ул. Примерная, д. 1",
  contact_website: "www.example.ru",
  contact_email: "info@example.ru",
  contact_phone: "+7 (831) 000-00-00",
  section_title_chart: "Диаграмма характеристик",
  section_title_specs: "Технические характеристики",
};

function t(texts: PdfPreviewTexts | undefined, key: string): string {
  const v = texts?.[key];
  if (v != null && String(v).trim() !== "") return String(v).trim();
  return DEFAULTS[key] ?? "";
}

export function buildPdfPreviewSamples(
  texts?: PdfPreviewTexts,
  options?: PdfPreviewOptions,
) {
  const selectionCount = Math.max(1, Math.min(5, options?.selectionCount ?? 1));
  const pumpTitle = t(texts, "pump_installation_title");
  const marking = "KNT BPS-C 2 HMIP";
  const description = `${pumpTitle} ${marking}`.trim();
  const priceOnRequest = t(texts, "price_on_request");
  const offerPrefix = t(texts, "commercial_offer_prefix");

  const tkpSummaryRows = Array.from({ length: selectionCount }, (_, i) => {
    const n = String(i + 1);
    const name =
      i === 0
        ? description
        : `${pumpTitle} KNT BPS-C ${i + 2} HMIP`;
    return {
      n,
      name,
      q: "15",
      h: "20",
      price: i === 0 ? "995 521.41" : `${(1_204_431 + i * 50_000).toLocaleString("ru-RU")}.82`,
    };
  });

  return {
    selectionCount,
    showTkpSummaryTable: selectionCount >= 2,
    tkpNumber: "№ТКП 123456",
    commercialOfferTitle: `${offerPrefix} №123456`,
    date: "19.05.2026",
    pricesLabel: "Розница",
    description,
    descriptionShort: description.length > 42 ? `${description.slice(0, 40)}…` : description,
    priceRetail: "995 521.41",
    sum: priceOnRequest,
    totalsLine: `Всего наименований: ${selectionCount}`,
    totalsPrice: `Итого, с НДС: 995 521.41 руб.`,
    executor: t(texts, "executor_body"),
    customerRows: [
      ["Кому:", "ООО «Заказчик»"],
      ["Проект:", "Объект тестовый"],
      ["Тел.:", "+7 (495) 000-00-00"],
    ] as [string, string][],
    kpTable: {
      headers: ["№", "Описание", "Кол-во, шт", "Срок поставки, недель", "Цена за ед. с НДС, руб.", "Стоимость с НДС, руб."],
      row: ["1", description, "1", "по запросу", "995 521.41", "995 521.41"],
    },
    tkpSummaryRows,
    mainHeader: `Гидромодуль циркуляции BPS-C 2 HMIP\n${offerPrefix} №123456`,
    sectionChart: t(texts, "section_title_chart"),
    sectionSpecs: t(texts, "section_title_specs"),
    techSheetSpecRows: [
      ["Насос", "СТРЕЛА BPS-C 2 HMIP"],
      ["Q / H", "15 м³/ч / 20 м"],
      ["Мощность", "5.5 кВт"],
      ["Материал", "нерж. сталь"],
      ["Кожух", "с обогревом"],
    ] as [string, string][],
  };
}

export type PdfPreviewSamples = ReturnType<typeof buildPdfPreviewSamples>;
