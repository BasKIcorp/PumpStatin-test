import { useCallback, useEffect, useState } from "react";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  fetchProfilesList,
  updateAdminUser,
  type AdminUser,
} from "@/api/admin";

const emptyForm = {
  username: "",
  password: "",
  displayName: "",
  organization: "",
  profileId: "default",
  role: "user",
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; displayName?: string }[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    fetchAdminUsers()
      .then((r) => setUsers(r.users))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, []);

  useEffect(() => {
    reload();
    fetchProfilesList()
      .then((r) => setProfiles(r.profiles))
      .catch(() => {});
  }, [reload]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editing) {
        await updateAdminUser(editing, {
          displayName: form.displayName,
          profileId: form.profileId,
          organization: form.organization || undefined,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        setMessage("Пользователь обновлён");
      } else {
        await createAdminUser({
          username: form.username,
          password: form.password,
          displayName: form.displayName,
          profileId: form.profileId,
          organization: form.organization || undefined,
          role: form.role,
        });
        setMessage("Пользователь создан");
      }
      setForm(emptyForm);
      setEditing(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  };

  const startEdit = (u: AdminUser) => {
    setEditing(u.username);
    setForm({
      username: u.username,
      password: "",
      displayName: u.displayName,
      organization: u.organization ?? "",
      profileId: u.profileId,
      role: u.role,
    });
  };

  const handleDelete = async (username: string) => {
    if (!confirm(`Удалить пользователя ${username}?`)) return;
    try {
      await deleteAdminUser(username);
      reload();
      setMessage("Удалено");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Пользователи</h1>

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <form
        onSubmit={handleCreate}
        className="grid max-w-xl gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2"
      >
        <h2 className="sm:col-span-2 text-sm font-semibold">
          {editing ? `Редактирование: ${editing}` : "Новый пользователь"}
        </h2>
        <Field label="Логин">
          <input
            className="field"
            value={form.username}
            disabled={!!editing}
            required
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </Field>
        <Field label={editing ? "Новый пароль (опционально)" : "Пароль"}>
          <input
            className="field"
            type="password"
            value={form.password}
            required={!editing}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <Field label="Имя">
          <input
            className="field"
            value={form.displayName}
            required
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
        </Field>
        <Field label="Организация">
          <input
            className="field"
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
          />
        </Field>
        <Field label="Профиль (витрина)">
          <select
            className="field"
            value={form.profileId}
            onChange={(e) => setForm({ ...form, profileId: e.target.value })}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName ?? p.id}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Роль">
          <select
            className="field"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </Field>
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className="btn-primary">
            {editing ? "Сохранить" : "Создать"}
          </button>
          {editing ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
              }}
            >
              Отмена
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Логин</th>
              <th className="px-3 py-2">Имя</th>
              <th className="px-3 py-2">Организация</th>
              <th className="px-3 py-2">Профиль</th>
              <th className="px-3 py-2">Роль</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{u.username}</td>
                <td className="px-3 py-2">{u.displayName}</td>
                <td className="px-3 py-2">{u.organization ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{u.profileId}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" className="text-[#13347f] hover:underline" onClick={() => startEdit(u)}>
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="ml-2 text-red-600 hover:underline"
                    onClick={() => handleDelete(u.username)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-neutral-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
