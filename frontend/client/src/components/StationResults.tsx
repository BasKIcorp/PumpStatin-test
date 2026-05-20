import React, { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { StationResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download as DownloadIcon, Mail as MailIcon, Send as SendIcon } from "lucide-react";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { sendStationPdfEmailToSelf, downloadStationPdf } from "@/lib/api";

interface StationResultsProps {
  result: StationResult | null;
  isLoading: boolean;
  onEmailChange?: (email: string) => void;
  onWorkflowChange?: (step: "initial" | "email-form" | "final-actions") => void;
  stationParams?: Record<string, any> | null;
  pdfFilename?: string | null;
  /** Скрыть сохранение / email (экран подбора по макету без превью PDF) */
  hideWorkflow?: boolean;
}

const StationResults: React.FC<StationResultsProps> = ({
  result,
  isLoading,
  onEmailChange,
  onWorkflowChange,
  stationParams,
  pdfFilename,
  hideWorkflow = false,
}) => {
  const { showNotification: toast } = useToastNotification();
  
  // State for workflow
  const [workflowStep, setWorkflowStep] = useState<'initial' | 'email-form' | 'final-actions'>('initial');
  const [email, setEmail] = useState("");
  const [isSendingToSelf, setIsSendingToSelf] = useState(false);

  const formatCurrency = (value: number) =>
    value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const parseResult = (res: any) => {
    if (!res) return null;

    if (typeof res === "object" && !Array.isArray(res)) {
      const { price, weight, name, code, length, width, height } = res;
      return {
        price: +price,
        weight: +weight,
        name: String(name),
        code: String(code),
        length: +length,
        width: +width,
        height: +height,
      };
    }

    if (Array.isArray(res)) {
      const [price, weight, name, code, length, width, height] = res;
      return {
        price: +price,
        weight: +weight,
        name: String(name),
        code: String(code),
        length: +length,
        width: +width,
        height: +height,
      };
    }

    return null;
  };

  const parsedResult = parseResult(result);

  // Сбрасываем workflow и email при изменении result (формировании новой станции)
  // Используем code как уникальный идентификатор для отслеживания новой станции
  useEffect(() => {
    if (parsedResult?.code) {
      setWorkflowStep('initial');
      setEmail("");
      onWorkflowChange?.('initial');
      onEmailChange?.("");
    }
  }, [parsedResult?.code]);

  const handleSaveClick = () => {
    setWorkflowStep('email-form');
    onWorkflowChange?.('email-form');
  };

  const handleEmailFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast("Введите email адрес", "error");
      return;
    }
    
    // Отправляем email себе при нажатии кнопки "Дальше"
    setIsSendingToSelf(true);
    try {
      let filename = pdfFilename;
      
      // Если filename нет, генерируем PDF для получения filename
      if (!filename && stationParams) {
        toast("Получаем имя файла...", "info");
        const { filename: generatedFilename, pdfWarnings } = await downloadStationPdf(stationParams);
        filename = generatedFilename;
        if (pdfWarnings.length) {
          toast(pdfWarnings.join(" · "), "info");
        }
      }
      
      if (filename) {
        await sendStationPdfEmailToSelf(email, filename);
        console.log("✅ Email себе отправлен успешно");
      } else {
        console.warn("⚠️ Не удалось получить имя файла для отправки");
      }
    } catch (error) {
      console.error("❌ Ошибка при отправке email себе:", error);
      // Не показываем ошибку пользователю, так как это фоновый процесс
    } finally {
      setIsSendingToSelf(false);
    }
    
    setWorkflowStep('final-actions');
    onWorkflowChange?.('final-actions');
    onEmailChange?.(email);
  };

  return (
    <div className="h-full">
      <div className="p-2 border-b border-black/15 bg-[var(--funnel-surface)]">
        <h2 className="text-sm font-semibold text-black">
          Результат конфигурации
        </h2>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : parsedResult ? (
          <div className="space-y-2">
            {/* Стоимость */}
            <div className="bg-muted/20 p-2">
              <p className="text-xs text-muted-foreground">Стоимость</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(parsedResult.price)} ₽
              </p>
            </div>

            {/* Масса */}
            <div className="bg-muted/20 p-2">
              <p className="text-xs text-muted-foreground">Масса</p>
              <p className="text-sm font-semibold text-foreground">
                {parsedResult.weight} кг
              </p>
            </div>

            {/* Габариты блок удалён */}

            <Separator />

            {/* Название */}
            <div className="bg-muted/20 p-2">
              <p className="text-xs text-muted-foreground">Название</p>
              <p className="text-sm font-semibold text-foreground break-words">
                {parsedResult.name}
              </p>
            </div>

            <Separator />

            {!hideWorkflow && workflowStep === "initial" ? (
              <div className="pt-1 text-right">
                <button
                  type="button"
                  disabled={!parsedResult}
                  onClick={handleSaveClick}
                  className="bg-accent hover:bg-accent/90 text-white px-2 py-1 rounded text-xs inline-flex items-center"
                >
                  <DownloadIcon className="w-4 h-4 mr-1" /> Сохранить
                </button>
              </div>
            ) : null}

            {!hideWorkflow && workflowStep === "email-form" ? (
              <div className="bg-muted/20 p-2">
                <div className="flex items-center mb-2">
                  <MailIcon className="w-4 h-4 mr-2 text-primary" />
                  <p className="text-xs text-muted-foreground">Введите email для отправки</p>
                </div>

                <form onSubmit={handleEmailFormSubmit} className="space-y-2">
                  <div>
                    <Label htmlFor="email" className="text-xs">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        onEmailChange?.(e.target.value);
                      }}
                      placeholder="example@email.com"
                      className="text-xs h-8"
                      required
                    />
                  </div>

                  <Button type="submit" disabled={!email.trim() || isSendingToSelf} className="w-full h-8 text-xs">
                    <div className="flex items-center">
                      {isSendingToSelf ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-white mr-1"></div>
                          Отправка...
                        </>
                      ) : (
                        <>
                          <SendIcon className="w-3 h-3 mr-1" />
                          Дальше
                        </>
                      )}
                    </div>
                  </Button>
                </form>
              </div>
            ) : null}

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground mb-3"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            <p className="text-muted-foreground">
              Здесь будет отображен результат после<br />
              формирования конфигурации насосной станции
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StationResults;
