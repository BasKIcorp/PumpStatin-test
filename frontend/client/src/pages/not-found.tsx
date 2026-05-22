import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4">
      <Card className="w-full max-w-md border-border bg-card ring-1 ring-[color-mix(in_srgb,var(--funnel-primary)_25%,transparent)]">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-primary shrink-0" />
            <h1 className="font-display text-2xl font-bold tracking-wide">404 — страница не найдена</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Страница отсутствует в маршрутизаторе приложения.
          </p>
          <p className="mt-4">
            <a href="/" className="text-primary text-sm hover:underline">
              ← На главную
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
