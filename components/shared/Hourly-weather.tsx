"use client";

import Image from "next/image";
import React, { useRef, useEffect } from "react";
import { DateTime } from "luxon";
interface Hour {
  time: string; // ISO строка
  temp: number;
  wind: number;
  precip: number;
  code: number;
}

interface HourlyWeatherProps {
  days: {
    hourly: {
      time: string[];
      temperature_2m: number[];
      wind_speed_10m: number[];
      precipitation: number[];
      weathercode: number[];
    };
  };
}

export default function HourlyWeather({ days }: HourlyWeatherProps) {
  if (!days || !days.hourly) return null;

  const kievNow = DateTime.now().setZone("Europe/Kyiv");

  const today = kievNow.toISODate()!; // YYYY-MM-DD, тип string
  const kievNowHour = kievNow.startOf("hour");
  const currentHourRef = useRef<HTMLLIElement | null>(null);

  // Формуємо масив годинника для поточного дня
  const hours: Hour[] = days.hourly.time
    .map((time, idx) => ({
      time,
      temp: days.hourly.temperature_2m[idx] ?? 0,
      wind: days.hourly.wind_speed_10m?.[idx] ?? 0,
      precip: days.hourly.precipitation[idx] ?? 0,
      code: days.hourly.weathercode[idx] ?? 0,
    }))
    .filter((hour) => {
      const hourDate = DateTime.fromISO(hour.time)
        .setZone("Europe/Kyiv")
        .startOf("hour");
      return hourDate >= kievNowHour; // фільтруємо години від поточного часу і далі
    })
    .slice(0, 17); // Обмежуємо до наступних 17 годин

  // const getWeatherIconId = (code: number): string => {
  //   if (code === undefined || code === null) return "unknown";
  //   // Ясно / мало хмар / змінна хмарність / пасмурно
  //   if ([0, 1, 2, 3].includes(code)) return "sunny"; // або "clear", "clear-day" — як тобі зручніше
  //   // Туман
  //   if ([45, 48].includes(code)) return "sunny";
  //   // Мряка / дрібний дощ
  //   if ([51, 53, 55, 56, 57].includes(code)) return "sunny";
  //   // Дощ (включаючи freezing rain)
  //   if ([61, 63, 65, 66, 67].includes(code)) return "sunny";
  //   // Сніг / крижаний дощ / сніжні зерна
  //   if ([71, 73, 75, 77].includes(code)) return "sunny";
  //   // Зливи дощу
  //   if ([80, 81, 82].includes(code)) return "sunny";
  //   // Снігові зливи
  //   if ([85, 86].includes(code)) return "sunny";
  //   // Гроза (з градом або без)

  //   if ([95, 96, 99].includes(code)) return "sunny";
  //   // все інше (рідкісні коди або помилка)
  //   return "unknown";
  // };

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

  // Прокрутка до поточної години після рендерингу
  useEffect(() => {
    if (currentHourRef.current) {
      currentHourRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, []);

  return (
    <div>
      {/* Горизонтальний список погодинного прогнозу */}
      <ul
        className="flex gap-1 justify-evenly overflow-x-auto scroll-on-hover py-0.5"
        style={{ scrollBehavior: "smooth" }}
        aria-label="Погодинний прогноз погоди"
      >
        {hours.map((hour, idx) => {
          const hourTime = DateTime.fromISO(hour.time).setZone(
            "Europe/Kyiv",
          ).hour;

          const isCurrent = idx === 0; // поточна година

          return (
            <li
              key={hour.time}
              ref={isCurrent ? currentHourRef : null}
              aria-current={isCurrent ? "true" : undefined}
              className={`flex flex-col gap-2 items-center hover:bg-muted/70 rounded-xl text-shadow flex-shrink-0 py-0.5 ${
                isCurrent ? "bg-[color:var(--primary)] text-white" : ""
              }`}
            >
              {/* Час */}
              <time
                dateTime={hour.time}
                className="text-lg font-medium"
                style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
              >
                {hourTime}
              </time>

              {/* Іконка погоди */}
              <svg
                className="mx-1 w-[35px] h-[38px] text-foreground"
                aria-hidden="true"
              >
                <title>Стан погоди</title>
                <use href={`/icons.svg?v=4#${getWeatherIconId(hour.code)}`} />
              </svg>

              {/* Температура */}
              <p
                className="text-lg font-semibold"
                style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
              >
                {Math.round(hour.temp)}°
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
