import { Link } from "wouter";
import { LOGIN_PAGE_BRAND_SRC } from "@/lib/strela/selectionAssets";
import type { BlockProps } from "@pumpstation/contracts";
import { useAuthLogin } from "./AuthLoginProvider";

const inputCls =
  "w-full border border-black bg-white px-2 py-[5px] text-[12px] leading-[1.4] text-black outline-none focus:border-[1.5px] rounded-none";
const labelCls = "mb-[3px] block text-[10.5px] leading-tight text-[#757575]";

export function AuthBrandPanelBlock({ block }: BlockProps) {
  const src = String(block.props?.src ?? LOGIN_PAGE_BRAND_SRC);
  const alt = String(block.props?.alt ?? "");
  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full min-h-0 object-contain object-left"
      decoding="async"
      fetchPriority="low"
    />
  );
}

export function AuthLoginFormBlock({ block }: BlockProps) {
  const { email, setEmail, password, setPassword, error, loading, doLogin } = useAuthLogin();
  const title = String(block.props.title ?? "Вход");
  const emailLabel = String(block.props.emailLabel ?? "Email или логин");
  const passwordLabel = String(block.props.passwordLabel ?? "Пароль");
  const submitLabel = String(block.props.submitLabel ?? "Войти");
  const emailPlaceholder = String(block.props.emailPlaceholder ?? "");
  const passwordPlaceholder = String(block.props.passwordPlaceholder ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doLogin(email, password);
  };

  return (
    <div className="flex flex-col justify-center px-2 py-4" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
        <h2 className="mb-[18px] text-[14px] font-semibold leading-tight text-black">{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-[10px]">
            <label htmlFor="lf-email" className={labelCls}>
              {emailLabel}
            </label>
            <input
              id="lf-email"
              type="text"
              required
              autoComplete="username"
              placeholder={emailPlaceholder || undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="mb-[10px]">
            <label htmlFor="lf-password" className={labelCls}>
              {passwordLabel}
            </label>
            <input
              id="lf-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder={passwordPlaceholder || undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          {error ? (
            <p className="mb-3 text-[10.5px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-none border border-black bg-white py-[5px] text-[12px] font-semibold text-black hover:bg-neutral-50 disabled:opacity-50"
          >
            {loading ? "Вход…" : submitLabel}
          </button>
        </form>
    </div>
  );
}

export function AuthQuickLoginBlock({ block: _block }: BlockProps) {
  const { accounts, loading, doLogin, demoPassword } = useAuthLogin();

  if (accounts.length === 0) return null;

  return (
    <div className="border-t border-neutral-300 px-2 py-3">
      <p className="mb-[8px] text-[10px] font-medium uppercase tracking-wide text-[#757575]">
        Быстрый вход
      </p>
      <ul className="flex flex-col gap-[6px]">
        {accounts.map((account) => (
          <li key={account.username}>
            <button
              type="button"
              disabled={loading}
              onClick={() => void doLogin(account.username, demoPassword)}
              className="w-full rounded-none border border-black bg-white px-2 py-[6px] text-left text-[11px] text-black hover:bg-neutral-50 disabled:opacity-50"
            >
              <span className="block font-semibold">
                {account.organization ?? account.displayName}
              </span>
              <span className="block text-[10px] text-[#757575]">{account.displayName}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-[8px] text-[9.5px] text-[#999]">Пароль для всех: {demoPassword}</p>
    </div>
  );
}

export function AuthAdminEntryBlock({ block: _block }: BlockProps) {
  const { loading, doLogin, demoPassword } = useAuthLogin();

  return (
    <div className="border-t border-neutral-300 px-2 py-3">
        <p className="mb-[6px] text-[10px] font-medium uppercase tracking-wide text-[#757575]">
          Администрирование
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void doLogin("admin", demoPassword)}
          className="w-full rounded-none border border-[#13347f] bg-[#13347f] px-2 py-[6px] text-left text-[11px] font-semibold text-white hover:bg-[#0f2a66] disabled:opacity-50"
        >
          Панель администратора
        </button>
    </div>
  );
}

export function AuthBackLinkBlock({ block }: BlockProps) {
  const label = String(block.props.label ?? "← На главную");
  const href = String(block.props.href ?? "/");

  return (
    <p className="px-2 py-2 text-center text-[10.5px] text-[#757575]">
        <Link href={href} className="text-[#1a3d8f] hover:underline">
          {label}
        </Link>
    </p>
  );
}
