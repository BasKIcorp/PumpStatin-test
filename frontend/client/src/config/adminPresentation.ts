/**
 * Презентационный режим админки.
 *
 * Скрывает разделы/вкладки, которые не нужны на демо.
 * Чтобы вернуть в UI: поставьте нужный флаг в `false` и пересоберите фронт.
 */
export const ADMIN_PRESENTATION = {
  /** Весь раздел «Дизайн» в боковом меню (содержимое перенесено в White-Label). */
  hideDesignSection: true,
  /** Вкладка «Страница подбора» в White-Label (редактор layout). */
  hideWhiteLabelLayoutTab: true,
} as const;
