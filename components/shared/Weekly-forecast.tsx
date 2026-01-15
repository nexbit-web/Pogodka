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
      "day"
    );

    const diff = date.diff(today, "days").days;

    if (diff === 0) return "Сьогодні";
    if (diff === 1) return "Завтра";

    return shortDays[date.weekday % 7];
  }

  const getWeatherIcon = (code: number) => {
    const map: Record<number, string> = {
      0: "/1.svg",
      1: "/1.svg",
      2: "/1.svg",
      3: "/1.svg",
      45: "/1.svg",
      48: "/1.svg",
      51: "/1.svg",
      53: "/1.svg",
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
        "rounded-2xl bg-black/40 backdrop-blur-md border border-white/30 shadow-md pb-1",
        className
      )}
    >
      {/* Заголовок */}
      <span className="flex gap-1 items-center pl-5 pt-2 font-medium text-shadow-muted-foreground">
        <CalendarDays size={20} /> 7-денний прогноз
      </span>

      {/* Дні */}
      {days.map((day) => (
        <div
          key={day.date}
          className="flex justify-around border-t border-white/5 mt-2 pt-2"
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
          <span className="font-bold" style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}>
            B: {Math.round(day.day.maxtemp_c)}° / H:{" "}
            {Math.round(day.day.mintemp_c)}°
          </span>
        </div>
      ))}
    </div>
  );
};
