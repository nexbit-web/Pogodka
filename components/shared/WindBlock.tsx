import { cn } from "@/lib/utils";
import React from "react";
import { Wind } from "lucide-react";
interface Props {
  className?: string;
  WindValues: number;
  GustsValues: number;
  DirectionValues: number;
}

export default function WindBlock({
  className,
  WindValues,
  GustsValues,
  DirectionValues,
}: Props) {
  function degToCompass(deg: number) {
    const directions = ["Пн", "ПнСх", "Сх", "ПдСх", "Пд", "ПдЗх", "Зх", "ПнЗх"];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  }

  const WindArrow: React.FC<{ deg: number }> = ({ deg }) => (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* КРУГ СО ШТРИХАМИ */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full text-muted-foreground"
      >
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i * 360) / 60;
          const isMain = i % 5 === 0;

          return (
            <line
              key={i}
              x1="50"
              y1={isMain ? 6 : 10}
              x2="50"
              y2={isMain ? 14 : 13}
              stroke="currentColor"
              strokeWidth={isMain ? 1.8 : 0.8}
              opacity={isMain ? 0.8 : 0.4}
              transform={`rotate(${angle} 50 50)`}
            />
          );
        })}
      </svg>

      {/* СТРЕЛКА */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
        style={{ transform: `rotate(${deg}deg)` }}
      >
        <svg className="text-foreground h-23  ">
          {/* <use href="/0.svg" /> */}
          <use href="/icons.svg#wind" />
        </svg>
      </div>
    </div>
  );
  return (
    <div
      className={cn(
        "flex justify-between items-stretch rounded-2xl h-full",
        className,
      )}
    >
      <div className="flex flex-col justify-between m-0 p-0 w-[60%] h-full">
        {/* Заголовок */}
        <span className="flex gap-1 items-center pl-3 pt-2 font-medium text-shadow-muted-foreground mt-0 sticky">
          <Wind size={20} /> ВІТЕР
        </span>

        <div className="pl-3 pt-2 flex justify-between gap-4">
          <span className="font-bold">Вітер</span>
          <samp className="text-shadow-muted-foreground">{WindValues} м/с</samp>
        </div>
        <div className="pl-3 pt-2 flex justify-between gap-4">
          <span className="font-bold">Пориви</span>
          <samp className="text-shadow-muted-foreground">
            {GustsValues} м/с
          </samp>
        </div>
        <div className="pl-3 pt-2 flex justify-between gap-4 mb-4">
          <span className="font-bold">Напрямок</span>
          <samp className="text-shadow-muted-foreground">
            {DirectionValues}° {degToCompass(DirectionValues)}
          </samp>
        </div>
      </div>
      <div className="w-[40%] flex items-center justify-center rounded-tr-2xl rounded-br-2xl">
        <WindArrow deg={DirectionValues} />
      </div>
    </div>
  );
}
