import {
  OPEN_ADMIN_AND_DB_ACCESS,
  effectiveUserRole,
  isPublicDataTableEditable,
} from "@shared/admin-access-policy";
import type { AuthUser } from "@/lib/auth";

export { OPEN_ADMIN_AND_DB_ACCESS, effectiveUserRole, isPublicDataTableEditable };

/** Доступ к админ-панели и вкладкам БД (встроенный кабинет и /admin). */
export function canAccessAdminPanel(_user: AuthUser | null | undefined): boolean {
  if (OPEN_ADMIN_AND_DB_ACCESS) return true;
  return _user?.role === "admin";
}

/** Категория «Простые насосы» и прочие фичи, ранее только для admin. */
export function canUseAdminOnlyFeatures(_user: AuthUser | null | undefined): boolean {
  return canAccessAdminPanel(_user);
}
