// components/WeatherAnalyticsDynamic.tsx
"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function WeatherAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Отправка события без ожидания ответа
    navigator.sendBeacon(
      `https://crm-pogodka.vercel.app/api/track?p=${pathname}`,
    );
  }, [pathname]);

  return null;
}
