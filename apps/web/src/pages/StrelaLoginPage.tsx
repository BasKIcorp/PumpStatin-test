import { useEffect, useState } from "react";
import { Link } from "wouter";
import { fetchDemoAccounts, login, type DemoAccount } from "@/api/auth";
import { LOGIN_PAGE_BRAND_SRC } from "@/lib/strela/selectionAssets";
import { useAuthStore } from "@/stores/authStore";

const DEMO_PASSWORD = "demo123";

const inputCls =
  "w-full border border-black bg-white px-2 py-[5px] text-[12px] leading-[1.4] text-black outline-none focus:border-[1.5px] rounded-none";
const labelCls = "mb-[3px] block text-[10.5px] leading-tight text-[#757575]";

/** Страница входа — layout и ассеты из pump_station (group-1-brand.svg) */
export function StrelaLoginPage() {
  const setSession = useAuthStore((s) => s.setSession);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDemoAccounts()
      .then((r) => setAccounts(r.accounts))
      .catch(() => setAccounts([]));
  }, []);

  const doLogin = async (username: string, pass: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await login(username, pass);
      const role = res.role ?? res.user.role ?? "user";
      setSession(res.accessToken, { ...res.user, role });
      window.location.assign(role === "admin" ? "/admin" : "/");
    } catch {
      setError("Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doLogin(email, password);
  };

  const quickLogin = (account: DemoAccount) => {
    setEmail(account.username);
    void doLogin(account.username, DEMO_PASSWORD);
  };

  const form = (
    <>
      <h2 className="mb-[18px] text-[14px] font-semibold leading-tight text-black">Вход</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-[10px]">
          <label htmlFor="lf-email" className={labelCls}>
            Email или логин
          </label>
          <input
            id="lf-email"
            type="text"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="mb-[10px]">
          <label htmlFor="lf-password" className={labelCls}>
            Пароль
          </label>
          <input
            id="lf-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="mb-[14px] mt-[8px] flex items-center justify-between text-[10.5px] text-[#757575]">
          <a href="#" className="hover:underline" onClick={(e) => e.preventDefault()}>
            Забыли пароль
          </a>
          <a
            href="#"
            className="font-medium text-[#1a3d8f] hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Регистрация
          </a>
        </div>
        {error ? (
          <p className="mb-3 break-words text-left text-[10.5px] leading-snug text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-none border border-black bg-white py-[5px] text-[12px] font-semibold text-black transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          {loading ? "Вход…" : "Войти"}
        </button>
      </form>

      {accounts.length > 0 ? (
        <div className="mt-[20px] border-t border-neutral-300 pt-[14px]">
          <p className="mb-[8px] text-[10px] font-medium uppercase tracking-wide text-[#757575]">
            Быстрый вход
          </p>
          <ul className="flex flex-col gap-[6px]">
            {accounts.map((account) => (
              <li key={account.username}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => quickLogin(account)}
                  className="w-full rounded-none border border-black bg-white px-2 py-[6px] text-left text-[11px] leading-snug text-black transition-colors hover:bg-neutral-50 disabled:opacity-50"
                >
                  <span className="block font-semibold">
                    {account.organization ?? account.displayName}
                  </span>
                  <span className="block text-[10px] text-[#757575]">
                    {account.displayName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-[8px] text-[9.5px] text-[#999]">Пароль для всех: {DEMO_PASSWORD}</p>
        </div>
      ) : null}

      <div className="mt-[16px] border-t border-neutral-300 pt-[12px]">
        <p className="mb-[6px] text-[10px] font-medium uppercase tracking-wide text-[#757575]">
          Администрирование
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void doLogin("admin", DEMO_PASSWORD)}
          className="w-full rounded-none border border-[#13347f] bg-[#13347f] px-2 py-[6px] text-left text-[11px] font-semibold text-white transition-colors hover:bg-[#0f2a66] disabled:opacity-50"
        >
          Панель администратора
          <span className="mt-0.5 block text-[10px] font-normal opacity-90">admin · {DEMO_PASSWORD}</span>
        </button>
      </div>

      <p className="mt-[16px] text-center text-[10.5px] text-[#757575]">
        <Link href="/" className="text-[#1a3d8f] hover:underline">
          ← На главную
        </Link>
      </p>
    </>
  );

  return (
    <div
      className="flex min-h-[100dvh] w-full max-w-full overflow-x-hidden antialiased"
      style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}
    >
      <div
        className="box-border max-sm:hidden h-[100dvh] min-h-0 min-w-0 shrink-0 grow-0 basis-[67.2%] overflow-hidden bg-white pl-0 pr-2 sm:pr-4"
        aria-hidden
      >
        <div className="flex h-full w-full min-h-0 min-w-0">
          <img
            src={LOGIN_PAGE_BRAND_SRC}
            alt=""
            className="h-full w-full min-h-0 object-contain object-left"
            decoding="async"
            fetchPriority="low"
          />
        </div>
      </div>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col items-center justify-center bg-white px-4">
        <div className="mb-6 w-full max-w-[172px] sm:hidden">
          <img
            src={LOGIN_PAGE_BRAND_SRC}
            alt=""
            className="mx-auto h-32 w-full max-w-[200px] object-contain object-left"
            decoding="async"
          />
        </div>
        <div className="w-full" style={{ maxWidth: 172, padding: "0 8px" }}>
          {form}
        </div>
      </div>
    </div>
  );
}
