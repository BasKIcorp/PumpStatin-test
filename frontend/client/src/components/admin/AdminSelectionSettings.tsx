import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  adminGetSelectionSettings,
  adminPatchSelectionSettings,
  type AdminSelectionSettingsResponse,
} from "@/lib/api";

type DraftVals = Record<string, number | boolean | string>;

function cloneDraft(src: DraftVals): DraftVals {
  return { ...src };
}

function loadErrorMessage(e: unknown): string {
  const ax = e as {
    response?: { status?: number; data?: { error?: string; detail?: unknown } };
    message?: string;
  };
  const d = ax?.response?.data;
  if (d && typeof d === "object" && typeof d.error === "string") return d.error;
  const st = ax?.response?.status;
  if (st === 404) {
    return "Метод /api/admin/selection-settings не найден. Нужен перезапуск API с актуальным кодом и маршрутом.";
  }
  if (st === 403 || st === 401) {
    return "Нет доступа к админке (нужна сессия staff). Выйдите и войдите снова.";
  }
  if (e instanceof Error) return e.message;
  return "Не удалось загрузить настройки";
}

export function AdminSelectionSettings() {
  const { showNotification } = useToastNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AdminSelectionSettingsResponse | null>(null);
  const [draft, setDraft] = useState<DraftVals>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const d = await adminGetSelectionSettings();
      setPayload(d);
      setDraft(cloneDraft(d.effective));
    } catch (e: unknown) {
      const msg = loadErrorMessage(e);
      setLoadError(msg);
      showNotification({ title: "Ошибка", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    void load();
  }, [load]);

  const setKey = (key: string, value: number | boolean | string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!payload) return;
    const thresholds: Record<string, unknown> = {};
    for (const f of payload.fields) {
      thresholds[f.key] = draft[f.key];
    }
    setSaving(true);
    try {
      const next = await adminPatchSelectionSettings({ thresholds });
      setPayload(next);
      setDraft(cloneDraft(next.effective));
      showNotification({ title: "Сохранено", description: "Пороги подбора обновлены." });
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } } };
      const msg = ax?.response?.data?.error ?? (e instanceof Error ? e.message : "Ошибка сохранения");
      showNotification({ title: "Ошибка", description: String(msg), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="card-industrial">
        <CardContent className="py-8 text-sm text-muted-foreground">Загрузка…</CardContent>
      </Card>
    );
  }

  if (loadError || !payload) {
    return (
      <Card className="card-industrial border-destructive/40">
        <CardHeader>
          <CardTitle>Не удалось открыть «Пороги подбора»</CardTitle>
          <p className="text-sm text-muted-foreground">{loadError ?? "Неизвестная ошибка"}</p>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => void load()}>
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="card-industrial">
        <CardHeader>
          <CardTitle>Пороги численного подбора насосов</CardTitle>
          <p className="text-sm text-muted-foreground">
            Численные параметры подбора по кривым насосов и константы расчёта станции (габариты, жокей,
            надбавки к стоимости) хранятся в объекте порогов. Сохранённые значения применяются к новым расчётам.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={saving}>
              Обновить
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraft(cloneDraft(payload.defaults))}
              disabled={saving}
            >
              Заполнить по умолчанию
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraft(cloneDraft(payload.effective))}
              disabled={saving}
            >
              Сбросить к сохранённым
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2">
            {payload.fields.map((f) => {
              const defVal = payload.defaults[f.key];
              const defLabel =
                typeof defVal === "boolean"
                  ? defVal
                    ? "да"
                    : "нет"
                  : typeof defVal === "string"
                    ? defVal || "—"
                    : String(defVal);
              return (
                <div key={f.key} className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
                  <Label className="text-sm font-medium leading-snug">{f.label}</Label>
                  <p className="text-[11px] text-muted-foreground">
                    По умолчанию: <span className="font-mono">{defLabel}</span>
                  </p>
                  {f.type === "bool" ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id={`th-${f.key}`}
                        checked={Boolean(draft[f.key])}
                        onCheckedChange={(v) => setKey(f.key, v === true)}
                      />
                      <Label htmlFor={`th-${f.key}`} className="cursor-pointer text-sm font-normal">
                        {draft[f.key] ? "Включено" : "Выключено"}
                      </Label>
                    </div>
                  ) : f.type === "str" ? (
                    <Input
                      id={`th-${f.key}`}
                      type="text"
                      value={(draft[f.key] as string) ?? ""}
                      onChange={(ev) => setKey(f.key, ev.target.value)}
                    />
                  ) : (
                    <Input
                      id={`th-${f.key}`}
                      type="number"
                      step={f.type === "int" ? 1 : "any"}
                      value={draft[f.key] ?? ""}
                      onChange={(ev) => {
                        const raw = ev.target.value;
                        if (raw === "" || raw === "-") return;
                        const n = f.type === "int" ? parseInt(raw, 10) : parseFloat(raw);
                        if (!Number.isFinite(n)) return;
                        setKey(f.key, n);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
