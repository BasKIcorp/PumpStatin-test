import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MultiSelectOption {
  value: string;
  label: string;
  image?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export const MultiSelect = ({
  options,
  selected,
  onChange,
  placeholder = "Выберите...",
}: MultiSelectProps) => {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Функция для получения изображения с поддержкой разных форматов
  const getImageSrc = (basePath: string) => {
    // Сначала пробуем .png, потом .jpg
    return basePath;
  };

  const getSelectedLabels = () => {
    const validSelected = selected.filter(item => item && item.trim() !== '');
    if (validSelected.length === 0) return placeholder;
    if (validSelected.length === 1) {
      // Для одного элемента показываем только короткое название
      return validSelected[0];
    }
    return `${validSelected.length} выбрано`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start font-normal",
            !Array.isArray(selected) || selected.filter(item => item && item.trim() !== '').length === 0 && "text-muted-foreground"
          )}
        >
          <span className="text-left ml-0">{getSelectedLabels()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0.5" align="start">
        <div className="flex flex-col space-y-0.5">
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <div
                key={option.value}
                onClick={() => toggle(option.value)}
                className={cn(
                  "cursor-pointer rounded px-0.5 py-0.5 hover:bg-muted flex items-center gap-0.5",
                  isSelected && "bg-primary text-white hover:bg-primary/90"
                )}
              >
                {option.image && (
                  <img 
                    src={getImageSrc(option.image)} 
                    alt={option.label}
                    className="w-10 h-10 object-contain flex-shrink-0"
                    onError={(e) => {
                      // Если .png не загрузился, пробуем .jpg
                      const target = e.target as HTMLImageElement;
                      if (target.src.endsWith('.png')) {
                        target.src = target.src.replace('.png', '.jpg');
                      }
                    }}
                  />
                )}
                <span className="text-sm">{option.label}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
