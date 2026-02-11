import { cn } from "@/lib/utils";
import { Dot, Gauge, MoveDown, MoveUp } from "lucide-react";
import React from "react";

interface Props {
  className?: string;
  PressureValues: number;
}

export default function Pressure({ className, PressureValues }: Props) {
  const pressureValue = Math.round(PressureValues);
  const getPressureText = (value: number) => {
    if (value < 1000) {
      return (
        <span className="flex items-center p-0 m-0">
          <MoveDown size={14} aria-hidden="true" />
          <span className="ml-1">Низький</span>
        </span>
      );
    }
    if (value < 1015) {
      return (
        <span className="flex items-center p-0 m-0">
          <Dot size={14} aria-hidden="true" />
          <span className="ml-1">Норма</span>
        </span>
      );
    }
    if (value < 1025) {
      return (
        <span className="flex items-center p-0 m-0">
          <MoveUp size={14} aria-hidden="true" />
          <span className="ml-1">Високий</span>
        </span>
      );
    }
    return (
      <span className="flex items-center p-0 m-0">
        <MoveUp size={14} aria-hidden="true" />
        <MoveUp size={14} aria-hidden="true" />
        <span className="ml-1">Дуже високий</span>
      </span>
    );
  };

  return (
    <section
      className={cn(
        "flex flex-col justify-between rounded-2xl h-full",
        className,
      )}
      aria-labelledby="pressure-title"
    >
      {/* Заголовок блоку */}
      <h3
        id="pressure-title"
        className="flex gap-1 items-center pl-3 pt-2 font-medium text-shadow-muted-foreground"
      >
        <Gauge size={20} aria-hidden="true" />
        Тиск
      </h3>

      {/* Основне значення тиску */}
      <output
        className="text-3xl font-semibold mb-2 pl-3 pt-2 flex flex-col items-start"
        aria-label={`Тиск ${pressureValue} гПа`}
      >
        {pressureValue} <span className="p-0 m-0">гПа</span>
      </output>

      {/* Пояснювальний текст */}
      <p className="text-sm text-shadow-muted-foreground mb-2 pl-3 pt-2">
        {getPressureText(PressureValues)}
      </p>
    </section>
  );
}
