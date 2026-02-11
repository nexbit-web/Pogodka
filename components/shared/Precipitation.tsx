import { cn } from "@/lib/utils";
import { Droplets } from "lucide-react";

interface Props {
  className?: string;
  PrecipitationValues: number;
}

export default function Precipitation({
  className,
  PrecipitationValues = 0,
}: Props) {
  const value = Number(PrecipitationValues.toFixed(1));

  // Автоматичний текст опадів
  const getPrecipitationText = (mm: number): string => {
    if (mm === 0) return "Без опадів";
    if (mm < 1) return "Невеликі опади";
    if (mm < 3) return "Легкий дощ";
    if (mm < 10) return "Помірний дощ";
    return "Сильні опади";
  };
  return (
    <section
      className={cn(
        "flex flex-col justify-between rounded-2xl h-full",
        className,
      )}
      aria-labelledby="precipitation-title"
    >
      {/* Заголовок блоку */}
      <h3
        id="precipitation-title"
        className="flex gap-1 items-center pl-3 pt-2 font-medium text-shadow-muted-foreground"
      >
        <Droplets size={20} aria-hidden="true" />
        Опади
      </h3>

      {/* Основне значення опадів */}
      <output
        className="text-3xl font-semibold mb-2 pl-3 pt-2"
        aria-label={`Опади ${value} міліметрів`}
      >
        {value} мм
      </output>

      {/* Пояснювальний текст */}
      <p className="text-sm text-shadow-muted-foreground mb-2 pl-3 pt-2">
        {getPrecipitationText(value)}
      </p>
    </section>
  );
}
