import { cn } from "@/lib/utils";
import React from "react";
import { Wind } from "lucide-react";
interface Props {
  className?: string;
  WindValues: number;
  GustsValues: number;
  DirectionValues: number;
}

export const WindBlock: React.FC<Props> = ({
  className,
  WindValues,
  GustsValues,
  DirectionValues,
}) => {
  function degToCompass(deg: number) {
    const directions = ["Пн", "ПнСх", "Сх", "ПдСх", "Пд", "ПдЗх", "Зх", "ПнЗх"];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  }

  const WindArrow: React.FC<{ deg: number }> = ({ deg }) => (
    <div className="w-20 h-20" style={{ transform: `rotate(${deg}deg)` }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-full h-full text-blue-500 "
      >
        <path
          d="M12 2 L12 22 M12 2 L8 6 M12 2 L16 6"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  );
  return (
    <div
      className={cn(
        "flex justify-between rounded-2xl bg-black/5 backdrop-blur-md border border-white/10 shadow-md",
        className
      )}
    >
      <div className="m-0 p-0 w-[50%]">
        {/* Заголовок */}
        <span className="flex gap-1 items-center pl-5 pt-2 font-medium text-muted-foreground">
          <Wind size={20} /> ВІТЕР
        </span>

        <div className="pl-5 pt-5 flex justify-between gap-4">
          <span className="">Вітер</span>
          <samp className="text-muted-foreground">{WindValues} м/с</samp>
        </div>
        <div className="pl-5 pt-5 flex justify-between gap-4">
          <span className="">Пориви</span>
          <samp className="text-muted-foreground">{GustsValues} м/с</samp>
        </div>
        <div className="pl-5 pt-5 flex justify-between gap-4 mb-4">
          <span className="">Напрямок</span>
          <samp className="text-muted-foreground">
            {DirectionValues}° {degToCompass(DirectionValues)}
          </samp>
        </div>
      </div>
      <div className="w-[50%] flex items-center justify-center rounded-tr-2xl rounded-br-2xl">
        <WindArrow deg={DirectionValues} />
      </div>
    </div>
  );
};
