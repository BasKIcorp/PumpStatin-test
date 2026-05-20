import React from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export type HeaderVariant = "default" | "simpel";

interface HeaderProps {
  variant?: HeaderVariant;
  /** default: блок с /assets/logo.png в шапке (variant default) */
  showLogo?: boolean;
  /** Заголовок в шапке (экран параметров / подбор) */
  pageTitle?: string;
  /** Логотип рядом с заголовком (этап подбора / параметры) */
  pageTitleLogoSrc?: string | null;
  /** strela | simpel из /api/appearance */
  brandKey?: "strela" | "simpel";
  /** Слева (например «Назад») — одна линия с заголовком и ЛК */
  leftSlot?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  variant = "default",
  showLogo = true,
  pageTitle,
  pageTitleLogoSrc = null,
  brandKey = "strela",
  leftSlot,
}) => {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  if (variant === "simpel") {
    const centerTitle =
      pageTitle ??
      (brandKey === "simpel" ? "Подбор насосов Simpel" : "Подбор насосного оборудования Стрела");
    return (
      <header
        className="relative shrink-0 bg-[var(--funnel-surface)] font-sans"
        style={{ fontFamily: "var(--funnel-font-body)" }}
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-2.5 sm:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {leftSlot}
              <div className="flex min-w-0 max-w-[min(100%,42rem)] flex-1 items-center justify-start gap-2 sm:gap-2.5">
                {pageTitleLogoSrc ? (
                  <img
                    src={pageTitleLogoSrc}
                    alt=""
                    className="h-7 w-auto max-h-9 max-w-[min(55vw,15rem)] shrink-0 object-contain object-left sm:h-8 sm:max-w-[17rem]"
                    decoding="async"
                  />
                ) : null}
                <h1 className="min-w-0 flex-1 truncate text-left text-base font-semibold text-black sm:text-lg md:text-xl">
                  {centerTitle}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 text-sm">
              {user ? (
                <>
                  {user.role === "admin" && (
                    <span className="hidden lg:inline rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Админ
                    </span>
                  )}
                  <a
                    href="/account"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/20 text-gray-700 transition-colors hover:bg-gray-50"
                    title={user.name || user.email}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </a>
                </>
              ) : (
                <a
                  href="/login"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/20 text-gray-700 transition-colors hover:bg-gray-50"
                  title="Войти"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm relative">
      {/* Industrial decorative element - top border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-accent to-primary/20"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center">
            {showLogo ? (
              <img
                src="/assets/logo.png"
                alt="Logo"
                className="w-[120px] max-h-16 mr-3 object-contain"
                onError={(e) => {
                  console.error("Failed to load logo:", e.currentTarget.src);
                }}
              />
            ) : null}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-black flex items-center">
                Конфигуратор насосных станций
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Онлайн-система подбора и настройки насосного оборудования
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            {user ? (
              <>
                {user.role === "admin" && (
                  <span className="hidden md:inline text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    Администратор
                  </span>
                )}
                <a
                  href="/account"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span className="hidden md:inline">{user.name || user.email}</span>
                </a>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Выйти"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </>
            ) : (
              <a
                href="/login"
                className="flex items-center space-x-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Войти</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
