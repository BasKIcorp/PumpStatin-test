import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

type NotificationType = "success" | "error" | "info";

/** Полная форма (как в shadcn toast) — используется в админке. */
export type ToastMessageOptions = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToastNotification() {
  const { toast } = useToast();

  const showNotification = useCallback(
    (messageOrOptions: string | ToastMessageOptions, type: NotificationType = "info") => {
      if (typeof messageOrOptions === "object" && messageOrOptions !== null) {
        const { title, description = "", variant = "default" } = messageOrOptions;
        toast({
          title,
          description,
          variant: variant === "destructive" ? "destructive" : "default",
        });
        return;
      }
      const message = messageOrOptions;
      toast({
        title: type === "info" ? "Информация" : type === "success" ? "Успешно" : "Ошибка",
        description: message,
        variant: type === "error" ? "destructive" : "default",
      });
    },
    [toast],
  );

  return { showNotification };
}
