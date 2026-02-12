import { redirect } from "next/navigation";

export interface ApiResponse {
  misto: string;
  oblast: string;
  kraina: string;
  latitude: number;
  longitude: number;
  weather: any;
}

export async function getWeather(city: string): Promise<ApiResponse | void> {
  const cityName = decodeURIComponent(city);

  const res = await fetch(
    `https://www.pogodka.org/api/pogoda?city=${encodeURIComponent(cityName)}`,
    { cache: "no-store" },
  );

  // 🔹 Если пользователь забанен, делаем редирект
  if (res.status === 403 || res.status === 429) {
    // Не парсим JSON — сразу редиректим
    redirect("/banned");
    return;
  }

  // Проверяем, что ответ валиден
  const text = await res.text();
  try {
    const data: ApiResponse = JSON.parse(text);
    return data;
  } catch (error) {
    console.error("Помилка при завантаженні даних:", text, error);
    throw new Error("Помилка при завантаженні даних");
  }
}
