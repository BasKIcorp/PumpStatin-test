import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminGetAllSelections,
  adminGetAllProjects,
  type AdminSelection,
  type AdminProject,
} from "@/lib/api";
import { ensureCsrf } from "@/lib/csrf";

/**
 * Журнал подборов и проектов по всем пользователям (только staff API).
 */
export function AdminAllUsersHistory() {
  const [allSelections, setAllSelections] = useState<AdminSelection[]>([]);
  const [allSelectionsTotal, setAllSelectionsTotal] = useState(0);
  const [allProjects, setAllProjects] = useState<AdminProject[]>([]);
  const [allProjectsTotal, setAllProjectsTotal] = useState(0);
  const [historyTab, setHistoryTab] = useState<"selections" | "projects">("selections");
  const [historyUserFilter, setHistoryUserFilter] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);

  const refreshAll = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [sel, proj] = await Promise.all([
        adminGetAllSelections({ limit: 100 }),
        adminGetAllProjects({ limit: 100 }),
      ]);
      setAllSelections(sel.rows);
      setAllSelectionsTotal(sel.total);
      setAllProjects(proj.rows);
      setAllProjectsTotal(proj.total);
    } catch {
      setAllSelections([]);
      setAllProjects([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void ensureCsrf().then(() => refreshAll());
  }, [refreshAll]);

  return (
    <Card className="card-industrial border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">История подборов — все пользователи</CardTitle>
        <p className="text-sm text-muted-foreground">
          Подборы и проекты по всей базе (доступно администраторам).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Фильтр по email или имени..."
            value={historyUserFilter}
            onChange={(e) => setHistoryUserFilter(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex gap-2">
            <Button
              variant={historyTab === "selections" ? "default" : "outline"}
              size="sm"
              type="button"
              onClick={() => setHistoryTab("selections")}
            >
              Подборы ({allSelectionsTotal})
            </Button>
            <Button
              variant={historyTab === "projects" ? "default" : "outline"}
              size="sm"
              type="button"
              onClick={() => setHistoryTab("projects")}
            >
              Проекты ({allProjectsTotal})
            </Button>
          </div>
          <Button size="sm" variant="outline" type="button" onClick={() => void refreshAll()}>
            Обновить
          </Button>
        </div>

        {loadingHistory ? (
          <div className="text-sm text-muted-foreground">Загрузка...</div>
        ) : historyTab === "selections" ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-2 text-left">Пользователь</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Насос</th>
                  <th className="p-2 text-left">Q</th>
                  <th className="p-2 text-left">H</th>
                  <th className="p-2 text-left">Типы</th>
                  <th className="p-2 text-left">Дата</th>
                </tr>
              </thead>
              <tbody>
                {allSelections
                  .filter(
                    (s) =>
                      !historyUserFilter ||
                      s.username.toLowerCase().includes(historyUserFilter.toLowerCase()) ||
                      s.email.toLowerCase().includes(historyUserFilter.toLowerCase()),
                  )
                  .map((s) => (
                    <tr key={s.id} className="border-b hover:bg-muted/20">
                      <td className="p-2 font-medium">{s.username}</td>
                      <td className="p-2 text-muted-foreground">{s.email}</td>
                      <td className="p-2">{s.pump_name || "—"}</td>
                      <td className="p-2">{s.Q}</td>
                      <td className="p-2">{s.H}</td>
                      <td className="p-2 text-xs">{s.pump_types || "—"}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {s.created_at ? new Date(s.created_at).toLocaleString("ru-RU") : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {allSelections.filter(
              (s) =>
                !historyUserFilter ||
                s.username.toLowerCase().includes(historyUserFilter.toLowerCase()) ||
                s.email.toLowerCase().includes(historyUserFilter.toLowerCase()),
            ).length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">Нет записей</div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-2 text-left">Пользователь</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Проект</th>
                  <th className="p-2 text-left">Адрес</th>
                  <th className="p-2 text-left">Подборов</th>
                  <th className="p-2 text-left">Дата</th>
                </tr>
              </thead>
              <tbody>
                {allProjects
                  .filter(
                    (p) =>
                      !historyUserFilter ||
                      p.username.toLowerCase().includes(historyUserFilter.toLowerCase()) ||
                      p.email.toLowerCase().includes(historyUserFilter.toLowerCase()),
                  )
                  .map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/20">
                      <td className="p-2 font-medium">{p.username}</td>
                      <td className="p-2 text-muted-foreground">{p.email}</td>
                      <td className="p-2">{p.name}</td>
                      <td className="p-2 text-xs">{p.address || "—"}</td>
                      <td className="p-2">{p.selections_count}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {p.created_at ? new Date(p.created_at).toLocaleString("ru-RU") : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {allProjects.filter(
              (p) =>
                !historyUserFilter ||
                p.username.toLowerCase().includes(historyUserFilter.toLowerCase()) ||
                p.email.toLowerCase().includes(historyUserFilter.toLowerCase()),
            ).length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">Нет записей</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
