/**
 * Презентационный режим админки (игнорируется при OPEN_ADMIN_AND_DB_ACCESS в shared/admin-access-policy.ts).
 *
 * Скрывает разделы/вкладки, которые не нужны на демо.
 * Чтобы вернуть в UI: поставьте OPEN_ADMIN_AND_DB_ACCESS = false и нужный флаг здесь.
 */
export const ADMIN_PRESENTATION = {
  /** Весь раздел «Дизайн» в боковом меню (содержимое перенесено в White-Label). */
  hideDesignSection: false,
  /** Вкладка «Страница подбора» в White-Label (редактор layout). */
  hideWhiteLabelLayoutTab: false,
} as const;
