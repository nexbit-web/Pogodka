"use client";
import { useEffect } from "react";

export function WeatherAnalytics() {
  useEffect(() => {
    try {
      navigator.sendBeacon(
        "https://crm-pogodka.vercel.app/api/track?p=" + location.pathname,
      );
    } catch {}
  }, []);

  return null;
}
