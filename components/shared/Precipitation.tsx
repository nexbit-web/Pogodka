import { cn } from "@/lib/utils";
import { Droplets } from "lucide-react";
import React from "react";

interface Props {
  className?: string;
  PrecipitationValues: number;
}

export const Precipitation: React.FC<Props> = ({
  className,
  PrecipitationValues = 0,
}) => {
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
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl h-full ",
        className
      )}
    >
      {/* Заголовок */}
      <span className="flex gap-1 items-center pl-3 pt-2 font-medium text-shadow-muted-foreground">
        <Droplets size={20} /> ОПАДИ
      </span>

      <div className="text-3xl font-semibold mb-2 pl-3 pt-2 ">{value} мм</div>

      <div className="text-sm text-shadow-muted-foreground mb-2 pl-3 pt-2 ">
        {getPrecipitationText(value)}
      </div>
    </div>
  );
};
