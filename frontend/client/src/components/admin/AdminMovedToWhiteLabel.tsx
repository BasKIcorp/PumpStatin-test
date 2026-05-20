import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminMovedToWhiteLabel({
  title,
  onNavigate,
}: {
  title: string;
  onNavigate: (leaf: string) => void;
}) {
  return (
    <Card className="card-industrial max-w-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Настройка перенесена в раздел <strong>Сайты → White-Label</strong> для каждой витрины отдельно.
        </p>
        <Button type="button" onClick={() => onNavigate("white-label")}>
          Открыть White-Label
        </Button>
      </CardContent>
    </Card>
  );
}
