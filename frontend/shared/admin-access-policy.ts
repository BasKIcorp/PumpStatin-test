/**
 * Постоянная политика проекта: админ-панель и работа с БД доступны всем.
 * Не включать проверки role === "admin" / is_staff без явного решения продукта.
 */
export const OPEN_ADMIN_AND_DB_ACCESS = true as const;

export type AppRole = "admin" | "user";

/** Роль, которую видит клиент и UI (при открытой политике всегда admin). */
export function effectiveUserRole(storedRole: string | null | undefined): AppRole {
  if (OPEN_ADMIN_AND_DB_ACCESS) return "admin";
  return storedRole === "admin" ? "admin" : "user";
}

/** Роль при создании нового пользователя в SQLite. */
export function defaultNewUserRole(requested?: string | null): AppRole {
  if (OPEN_ADMIN_AND_DB_ACCESS) return "admin";
  return requested === "admin" ? "admin" : "user";
}

/** Таблицы public-data всегда редактируемы в UI. */
export function isPublicDataTableEditable(_backendEditable?: boolean): boolean {
  if (OPEN_ADMIN_AND_DB_ACCESS) return true;
  return _backendEditable !== false;
}
