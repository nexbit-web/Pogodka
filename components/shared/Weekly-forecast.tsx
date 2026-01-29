import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import React from "react";
import { DateTime } from "luxon";
interface Day {
  date: string;
  day: {
    code: number;
    mintemp_c: number;
    maxtemp_c: number;
  };
}

interface Props {
  days: Day[];
  className?: string;
}

export const WeeklyForecast: React.FC<Props> = ({ days, className }) => {
  const shortDays = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  function getDayLabel(dateString: string) {
    const today = DateTime.now().setZone("Europe/Kyiv").startOf("day");
    const date = DateTime.fromISO(dateString, { zone: "Europe/Kyiv" }).startOf(
      "day",
    );

    const diff = date.diff(today, "days").days;

    if (diff === 0) return "Сьогодні";
    if (diff === 1) return "Завтра";

    return shortDays[date.weekday % 7];
  }

  const getWeatherIcon = (code: number) => {
    const map: Record<number, string> = {
      0: "/0.svg",
      1: "/1.svg",
      2: "/2.svg",
      3: "/3.svg",
      45: "/45.svg",
      48: "/48.svg",
      51: "/51.svg",
      53: "/53.svg",
      55: "/1.svg",
      61: "/1.svg",
      63: "/1.svg",
      65: "/1.svg",
      66: "/1.svg",
      67: "/1.svg",
      71: "/1.svg",
      73: "/1.svg",
      75: "/1.svg",
      77: "/1.svg",
      80: "/1.svg",
      81: "/1.svg",
      82: "/1.svg",
      85: "/1.svg",
      86: "/1.svg",
      95: "/1.svg",
      96: "/1.svg",
      99: "/1.svg",
    };
    return map[code] || "/icons/unknown.svg";
  };

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl pb-1 h-full",
        className,
      )}
    >
      {/* Заголовок */}
      <span className="flex gap-1 items-center pl-3 pt-2 font-medium text-shadow-muted-foreground">
        <CalendarDays size={20} /> 7-денний прогноз
      </span>

      {/* Дні */}
      {days.map((day) => (
        <div
          key={day.date}
          className="flex items-center justify-around border-t border-black/5   pt-1"
        >
          <h3
            className="capitalize font-bold"
            style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
          >
            {getDayLabel(day.date)}
          </h3>
          <img
            className="w-8 h-8"
            src={getWeatherIcon(day.day.code)}
            alt={`Погода ${day.day.code}`}
          />
          <span
            className="font-bold"
            style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
          >
            B: {Math.round(day.day.maxtemp_c)}° / H:{" "}
            {Math.round(day.day.mintemp_c)}°
          </span>
        </div>
      ))}
    </div>
  );
};
