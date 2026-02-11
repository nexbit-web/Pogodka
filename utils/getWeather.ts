// utils/getWeather.ts
import { redirect } from "next/navigation";

export interface ApiResponse {
  misto: string;
  oblast: string;
  kraina: string;
  latitude: number;
  longitude: number;
  weather: any;
}

/**
 * Получаем погоду для города.
 * Если бан — делаем редирект на /banned.
 */
export async function getWeather(city: string): Promise<ApiResponse> {
  const cityName = decodeURIComponent(city);
// https://pogodka.vercel.app/
  const res = await fetch(
    `https://pogodka.vercel.app/api/pogoda?city=${encodeURIComponent(cityName)}`,
    { cache: "no-store" },
  );

  if (res.status === 403 || res.status === 429) {
    // 🔹 користувач забанений ботом — редирект на сторінку бану
    return redirect("/banned");
  }

  try {
    const data: ApiResponse = await res.json();
    return data;
  } catch (error) {
    console.error("Помилка при завантаженні даних:", error);
    throw new Error("Помилка при завантаженні даних");
  }
}
