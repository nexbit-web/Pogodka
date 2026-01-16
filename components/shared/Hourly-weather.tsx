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

export const HourlyWeather: React.FC<HourlyWeatherProps> = ({ days }) => {
  if (!days || !days.hourly) return null;

  const kievNow = DateTime.now().setZone("Europe/Kyiv");

  const today = kievNow.toISODate()!; // YYYY-MM-DD, тип string
  const kievNowHour = kievNow.startOf("hour");
  const currentHourRef = useRef<HTMLDivElement | null>(null);

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
      <div
        className="flex gap-1 justify-evenly overflow-x-auto scroll-on-hover py-0.5"
        style={{ scrollBehavior: "smooth" }}
      >
        {hours.map((hour, idx) => {
          const hourTime = DateTime.fromISO(hour.time).setZone(
            "Europe/Kyiv"
          ).hour;
          const isCurrent = idx === 0; // перша година в списку - поточна година
          return (
            <div
              key={hour.time}
              ref={isCurrent ? currentHourRef : null} // <-- ref для поточної години
              className={`flex flex-col gap-2 items-center hover:bg-muted/70 rounded-xl text-shadow flex-shrink-0 py-0.5  ${
                isCurrent ? "bg-[color:var(--primary)] text-white" : ""
              }`}
            >
              <p
                className="text-lg font-medium"
                style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
              >
                {hourTime}
              </p>
              <Image
                className="mx-1"
                src={getWeatherIcon(hour.code)}
                alt="Weather icon"
                width={35}
                height={38}
              />
              <p
                className="text-lg font-semibold"
                style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
              >
                {Math.round(hour.temp)}°
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
