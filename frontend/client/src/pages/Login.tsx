import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LOGIN_PAGE_BRAND_SRC } from "@/lib/selectionAssets";

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/account");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax?.response?.data?.error || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  /* Стили полей из макета: прямоугольные чёрные рамки */
  const inputCls =
    "w-full border border-black bg-white px-2 py-[5px] text-[12px] leading-[1.4] text-black outline-none focus:border-[1.5px] rounded-none";
  const labelCls = "block text-[10.5px] leading-tight text-[#757575] mb-[3px]";

  const form = (
    <>
      <h2 className="text-[14px] font-semibold text-black mb-[18px] leading-tight">Вход</h2>
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
          <label htmlFor="lf-password" className={labelCls}>Пароль</label>
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
        <div className="flex items-center justify-between text-[10.5px] text-[#757575] mt-[8px] mb-[14px]">
          <a
            href="#"
            className="hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Забыли пароль
          </a>
          <a href="/register" className="text-[#1a3d8f] hover:underline font-medium">
            Регистрация
          </a>
        </div>
        {error ? (
          <p
            className="text-[10.5px] text-red-600 mb-3 break-words text-left leading-snug"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full border border-black bg-white text-[12px] font-semibold text-black py-[5px] hover:bg-neutral-50 disabled:opacity-50 transition-colors rounded-none"
        >
          {loading ? "Вход…" : "Войти"}
        </button>
      </form>
      <p className="mt-[24px] text-center text-[10.5px] text-[#757575]">
        <a href="/" className="text-[#1a3d8f] hover:underline">← На главную</a>
      </p>
    </>
  );

  return (
    <div className="flex min-h-[100dvh] w-full max-w-full overflow-x-hidden font-sans antialiased">

      {/* LEFT: тот же красный значок, что слева от названий карточек воронки — на всю высоту, к левому краю */}
      <div
        className="max-sm:hidden box-border h-[100dvh] min-h-0 min-w-0 shrink-0 grow-0 basis-[67.2%] overflow-hidden bg-white pl-0 pr-2 sm:pr-4"
        aria-hidden="true"
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

      {/* RIGHT: форма логина — белая панель */}
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col items-center justify-center bg-white">
        {/* Ширина блока формы пропорциональна макету: 164/315 ≈ 52% правой панели */}
        <div className="w-full" style={{ maxWidth: 172, padding: "0 8px" }}>
          {form}
        </div>
      </div>

    </div>
  );
}
