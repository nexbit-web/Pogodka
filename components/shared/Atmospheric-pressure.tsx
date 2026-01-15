import { cn } from "@/lib/utils";
import { Dot, Gauge, MoveDown, MoveUp } from "lucide-react";
import React from "react";

interface Props {
  className?: string;
  PressureValues: number;
}

export const Pressure: React.FC<Props> = ({ className, PressureValues }) => {
  const pressureValue = Math.round(PressureValues);
  const getPressureText = (value: number) => {
    if (value < 1000)
      return (
        <span className="flex items-center p-0 m-0">
          <MoveDown size={14} />
          Низький
        </span>
      );
    if (value < 1015)
      return (
        <span className="flex items-center p-0 m-0">
          <Dot size={14} /> Норма
        </span>
      );
    if (value < 1025)
      return (
        <span className="flex items-center p-0 m-0">
          <MoveUp size={14} />
          Високий
        </span>
      );
    return (
      <span className="flex items-center p-0 m-0">
        <MoveUp size={14} />
        <MoveUp size={14} /> Дуже високий
      </span>
    );
  };

  return (
    <div
      className={cn(
        "rounded-2xl bg-black/40 backdrop-blur-md border border-white/30 shadow-md",
        className
      )}
    >
      {/* Заголовок */}
      <span className="flex gap-1 items-center pl-5 pt-2 font-medium text-shadow-muted-foreground">
        <Gauge size={20} /> ТИСК
      </span>

      <div className="text-3xl font-semibold mb-2 pl-5 pt-2 flex flex-col items-start">
        {pressureValue} <span className="p-0 m-0">гПа</span>
      </div>

      <div className="text-sm text-shadow-muted-foreground mb-2 pl-5 pt-2">
        {getPressureText(PressureValues)}
      </div>
    </div>
  );
};
