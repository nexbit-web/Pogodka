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

  // Або якщо хочеш розширити пізніше:
  // Функция возвращает id иконки погоды по коду Open-Meteo
  const getWeatherIconId = (code: number): string => {
    // 0 — полностью ясное небо
    if (code === 0) return "clear";
    // 1,2 — малооблачно / переменная облачность
    // солнце видно, но есть облака
    if ([1, 2].includes(code)) return "partly-cloudy";
    // 3 — сплошная облачность
    // небо полностью в облаках
    if (code === 3) return "cloudy";
    // 45,48 — туман или туман с изморозью
    if ([45, 48].includes(code)) return "fog";
    // 51,53,55 — моросящий дождь (очень слабый дождь)
    if ([51, 53, 55].includes(code)) return "drizzle";
    // 56,57 — ледяная морось
    // 61,63,65 — обычный дождь слабый/средний/сильный
    // 66,67 — ледяной дождь
    // 80,81,82 — ливневые дожди
    // всё объединяем в одну иконку "дождь"
    if ([56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
    // 71,73,75 — снег слабый/средний/сильный
    // 77 — снежные зёрна
    // 85,86 — снегопады
    // объединяем в одну иконку "снег"
    if ([71, 73, 75, 77].includes(code)) return "snow";
    // 85,86 — снегопады
    if ([85, 86].includes(code)) return "snowfall";
    // 95 — обычная гроза без града
    if (code === 95) return "thunderstorm";
    // гроза с градом
    if ([96, 99].includes(code)) return "thunderstorm-hail";
    return "unknown";
  };

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
              <use href={`/icons.svg?v=4#${getWeatherIconId(day.day.code)}`} />
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
