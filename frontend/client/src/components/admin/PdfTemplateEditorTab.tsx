import React, { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PdfOverlayEditor } from "@/components/PdfOverlayEditor";
import {
  adminListPdfTemplates,
  adminGetPdfTemplate,
  adminCreatePdfTemplate,
  adminUpdatePdfTemplate,
  adminPublishPdfTemplate,
  adminArchivePdfTemplate,
  type PdfTemplateRevisionSummary,
  type PdfTemplateRevisionDetail,
  type TextOverlayConfig,
} from "@/lib/api";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { Plus, Save, CheckCircle, Archive } from "lucide-react";

type PageId = "first" | "second" | "main";

const PAGE_LABELS: Record<PageId, string> = {
  first: "Первая страница",
  second: "Вторая страница",
  main: "Основная страница",
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  DRAFT: { label: "Черновик", variant: "secondary" },
  PUBLISHED: { label: "Опубликован", variant: "default" },
  ARCHIVED: { label: "Архив", variant: "outline" },
};

function NewTemplateForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [key, setKey] = useState("");
  const { showNotification } = useToastNotification();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: () => adminCreatePdfTemplate({ key }),
    onSuccess: (rev) => {
      qc.invalidateQueries({ queryKey: ["pdf-templates"] });
      onCreated(rev.id);
      setKey("");
      showNotification("Черновик создан", "success");
    },
    onError: () => showNotification("Ошибка создания", "error"),
  });

  return (
    <div className="flex gap-2 items-end p-3 border-t border-border">
      <div className="flex-1">
        <Label className="text-xs">Ключ шаблона</Label>
        <Input
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="default, landing, etc."
          className="h-8 text-sm"
        />
      </div>
      <Button
        size="sm"
        onClick={() => create.mutate()}
        disabled={!key.trim() || create.isPending}
      >
        <Plus className="h-4 w-4 mr-1" />
        Создать
      </Button>
    </div>
  );
}

export function PdfTemplateEditorTab() {
  const { showNotification } = useToastNotification();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activePage, setActivePage] = useState<PageId>("first");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: list = [], isLoading: listLoading } = useQuery({
    queryKey: ["pdf-templates"],
    queryFn: adminListPdfTemplates,
  });

  const { data: detail } = useQuery({
    queryKey: ["pdf-template", selectedId],
    queryFn: () => adminGetPdfTemplate(selectedId!),
    enabled: selectedId !== null,
  });

  const update = useMutation({
    mutationFn: (payload: { snapshot: Record<string, unknown> }) =>
      adminUpdatePdfTemplate(selectedId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-template", selectedId] });
      showNotification("Черновик сохранён", "success");
    },
    onError: () => showNotification("Ошибка сохранения", "error"),
  });

  const publish = useMutation({
    mutationFn: () => adminPublishPdfTemplate(selectedId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-templates"] });
      qc.invalidateQueries({ queryKey: ["pdf-template", selectedId] });
      showNotification("Шаблон опубликован", "success");
    },
  });

  const archive = useMutation({
    mutationFn: () => adminArchivePdfTemplate(selectedId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-templates"] });
      qc.invalidateQueries({ queryKey: ["pdf-template", selectedId] });
      showNotification("Шаблон архивирован", "success");
    },
  });

  const snapshot = (detail?.snapshot ?? {}) as TextOverlayConfig;
  const currentStatus = detail?.status;
  const isEditable = currentStatus === "DRAFT";

  const handleOverlayChange = useCallback(
    (config: TextOverlayConfig) => {
      if (!isEditable || !selectedId) return;
      const merged = { ...snapshot, ...config };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        update.mutate({ snapshot: merged as Record<string, unknown> });
      }, 1500);
    },
    [isEditable, selectedId, snapshot, update],
  );

  return (
    <div className="flex h-full gap-0 rounded-lg border border-border overflow-hidden min-h-[600px]">
      {/* Левая панель — список ревизий */}
      <div className="w-56 flex flex-col border-r border-border bg-muted/30">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-semibold">PDF Шаблоны</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {listLoading && <p className="p-3 text-xs text-muted-foreground">Загрузка…</p>}
          {list.map((rev: PdfTemplateRevisionSummary) => {
            const badge = STATUS_BADGE[rev.status] ?? STATUS_BADGE.DRAFT;
            return (
              <button
                key={rev.id}
                onClick={() => setSelectedId(rev.id)}
                className={`w-full text-left px-3 py-2 text-sm border-b border-border transition-colors hover:bg-accent ${selectedId === rev.id ? "bg-accent" : ""}`}
              >
                <div className="font-medium truncate">{rev.key}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-muted-foreground">v{rev.version_no}</span>
                  <Badge variant={badge.variant} className="text-xs px-1 py-0">{badge.label}</Badge>
                </div>
              </button>
            );
          })}
        </div>
        <NewTemplateForm onCreated={(id) => setSelectedId(id)} />
      </div>

      {/* Правая панель — редактор */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedId ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Выберите шаблон или создайте новый
          </div>
        ) : (
          <>
            {/* Тулбар */}
            <div className="flex items-center gap-2 p-3 border-b border-border bg-background">
              <div className="flex gap-1">
                {(["first", "second", "main"] as PageId[]).map(p => (
                  <Button
                    key={p}
                    size="sm"
                    variant={activePage === p ? "default" : "outline"}
                    onClick={() => setActivePage(p)}
                    className="h-7 text-xs"
                  >
                    {PAGE_LABELS[p]}
                  </Button>
                ))}
              </div>
              <div className="flex-1" />
              {currentStatus && (
                <Badge variant={STATUS_BADGE[currentStatus]?.variant ?? "secondary"}>
                  {STATUS_BADGE[currentStatus]?.label ?? currentStatus}
                </Badge>
              )}
              {isEditable && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ snapshot: snapshot as Record<string, unknown> })}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Сохранить
                </Button>
              )}
              {isEditable && (
                <Button
                  size="sm"
                  disabled={publish.isPending}
                  onClick={() => publish.mutate()}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Опубликовать
                </Button>
              )}
              {currentStatus === "PUBLISHED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={archive.isPending}
                  onClick={() => archive.mutate()}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  В архив
                </Button>
              )}
            </div>

            {/* Редактор */}
            <div className="flex-1 overflow-auto p-4">
              <PdfOverlayEditor
                page={activePage}
                overlayConfig={snapshot}
                onOverlayConfigChange={handleOverlayChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
