"use client";
import { useEffect } from "react";

export function WeatherAnalytics() {
  useEffect(() => {
    const handleLoad = () => {
      try {
        navigator.sendBeacon(
          "https://crm-pogodka.vercel.app/api/track?p=" + location.pathname,
        );
      } catch {}
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  return null;
}
