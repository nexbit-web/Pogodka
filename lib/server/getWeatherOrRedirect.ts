// utils/weatherService.ts
import { redirect } from "next/navigation";

interface ApiResponse {
  misto: string;
  oblast: string;
  kraina: string;
  latitude: number;
  longitude: number;
  weather: any;
}

export async function getWeatherOrRedirect(city: string): Promise<ApiResponse> {
  const cityName = decodeURIComponent(city);
  // https://pogodka.vercel.app/
  // http://localhost:3000
  //  https://www.pogodka.org
  const res = await fetch(
    `https://www.pogodka.org/api/pogoda?city=${encodeURIComponent(cityName)}`,
    { cache: "no-store" },
  );

  if (res.status === 403 || res.status === 429) {
    redirect(`/banned?city=${encodeURIComponent(cityName)}`);
  }

  const data: ApiResponse = await res.json();
  return data;
}
