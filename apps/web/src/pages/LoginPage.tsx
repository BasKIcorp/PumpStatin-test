import { useEffect, useState } from "react";
import { fetchDemoAccounts, login, type DemoAccount } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

export function LoginPage() {
  const setSession = useAuthStore((s) => s.setSession);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDemoAccounts()
      .then((r) => setAccounts(r.accounts))
      .catch(() => setAccounts([]));
  }, []);

  const submit = async (u: string, p: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await login(u, p);
      setSession(res.accessToken, res.user);
      window.location.assign("/");
    } catch {
      setError("Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-neutral-900">Вход в подбор</h1>
        <p className="mt-2 text-sm text-neutral-600">
          У каждого аккаунта свой внешний вид и формат PDF.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(username, password);
          }}
        >
          <label className="block text-sm">
            Логин
            <input
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            Пароль
            <input
              type="password"
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !username}
            className="w-full rounded bg-[#1e4a8c] py-2.5 text-white disabled:opacity-50"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>

        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Демо-аккаунты (пароль demo123)
          </p>
          <ul className="mt-3 space-y-2">
            {accounts.map((a) => (
              <li key={a.username}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:border-[#1e4a8c] hover:bg-blue-50"
                  onClick={() => {
                    setUsername(a.username);
                    void submit(a.username, "demo123");
                  }}
                >
                  <span className="font-medium">{a.displayName}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {a.username} → профиль {a.profileId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
