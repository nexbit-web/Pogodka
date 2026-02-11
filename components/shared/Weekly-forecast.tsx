import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
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

export default function WeeklyForecast({ days, className }: Props) {
  const shortDays = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  function getDayLabel(dateString: string) {
    const today = DateTime.now().setZone("Europe/Kyiv").startOf("day");
    const date = DateTime.fromISO(dateString, { zone: "Europe/Kyiv" }).startOf(
      "day",
    );

    const diff = date.diff(today, "days").days;

    if (diff === 0) return "Сьогодні";
    // if (diff === 1) return "Завтра";

    return shortDays[date.weekday % 7];
  }
  const getWeatherIconId = (code: number): string => {
    // Більшість кодів → sunny (як у тебе зараз)
    if (
      [
        0, 1, 2, 3, 45, 48, 51, 53, 55, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80,
        81, 82, 85, 86, 95, 96, 99,
      ].includes(code)
    ) {
      return "sunny";
    }
    return "unknown";
  };

  // Або якщо хочеш розширити пізніше:
  // const getWeatherIconId = (code: number): string => {
  //   switch (true) {
  //     case [0, 1, 2, 3].includes(code): return "sunny"; // або "clear-day" тощо
  //     case [45, 48].includes(code): return "fog";
  //     case [51, 53, 55].includes(code): return "drizzle";
  //     case [61, 63, 65].includes(code): return "rain";
  //     case [71, 73, 75, 77].includes(code): return "snow";
  //     case [80, 81, 82].includes(code): return "rain-showers";
  //     case [95, 96, 99].includes(code): return "thunderstorm";
  //     default: return "unknown";
  //   }
  // };

  return (
    <section
      className={cn(
        "flex flex-col justify-between rounded-2xl pb-1 h-full",
        className,
      )}
      aria-labelledby="weekly-forecast-title"
    >
      {/* Заголовок блоку */}
      <h2
        id="weekly-forecast-title"
        className="flex gap-1 items-center pl-3 pt-2 font-medium text-shadow-muted-foreground"
      >
        <CalendarDays size={20} aria-hidden="true" />
        7-денний прогноз
      </h2>

      {/* Список днів */}
      <ul className="flex flex-col">
        {days.map((day) => (
          <li
            key={day.date}
            className="flex items-center justify-between border-t border-black/5 pt-1 px-3"
          >
            {/* День тижня */}
            <span
              className="capitalize font-bold"
              style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
              aria-label={`День: ${getDayLabel(day.date)}`}
            >
              {getDayLabel(day.date)}
            </span>

            {/* Іконка погоди */}
            <svg className="w-8 h-8 text-foreground" aria-hidden="true">
              <use href={`/icons.svg?v=2#${getWeatherIconId(day.day.code)}`} />
            </svg>

            {/* Мін/макс температура */}
            <span
              className="font-bold"
              style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
              aria-label={`Максимальна температура ${Math.round(
                day.day.maxtemp_c,
              )} градусів, мінімальна ${Math.round(day.day.mintemp_c)} градусів`}
            >
              B: {Math.round(day.day.maxtemp_c)}° / H:{" "}
              {Math.round(day.day.mintemp_c)}°
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
