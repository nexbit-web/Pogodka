import { Container } from "@/components/shared/Container";
import { HourlyWeather } from "@/components/shared/Hourly-weather";
import { WeatherHeadline } from "@/components/shared/Weather-headline";
import { DateTime } from "luxon";
interface PageProps {
  params: Promise<{ city: string }>;
}
interface ApiResponse {
  misto: string;
  oblast: string;
  kraina: string;
  latitude: number;
  longitude: number;
  weather: any; // Об'єкт Open-Meteo
}

export default async function WeatherPage({ params }: PageProps) {
  const { city } = await params;
  const cityName = decodeURIComponent(city);

  // const baseUrl =
  //   process.env.NODE_ENV === "development"
  //     ? "http://localhost:3000"
  //     : process.env.VERCEL_URL
  //     ? `https://${process.env.VERCEL_URL}`
  //     : "https://pogodka.vercel.app";

  let data: ApiResponse;
// https://pogodka.vercel.app
  try {
    const apiRes = await fetch(
      `http://localhost:3000/api/pogoda?city=${encodeURIComponent(
        cityName
      )}`,
      { cache: "no-store" }
    );

    if (!apiRes.ok) {
      throw new Error("API error");
    }

    data = await apiRes.json();
  } catch (error) {
    console.error("Помилка при завантаженні даних:", error);
    return (
      <h1 className="text-center mt-10 text-xl">Помилка завантаження даних</h1>
    );
  }

  const { weather } = data;

  const kievNow = DateTime.now().setZone("Europe/Kyiv");

  const today = kievNow.toISODate()!;
  const currentHour = kievNow.hour;

  const hourIndex = weather.hourly.time.findIndex((time: string) => {
    const hour = DateTime.fromISO(time, { zone: "Europe/Kyiv" }).hour;
    return time.startsWith(today) && hour === currentHour;
  });

  const currentTemp =
    weather.hourly.temperature_2m[hourIndex >= 0 ? hourIndex : 0] ?? 0;
  const currentFeels =
    weather.hourly.apparent_temperature[hourIndex >= 0 ? hourIndex : 0] ?? 0;
  const currentCode =
    weather.hourly.weathercode[hourIndex >= 0 ? hourIndex : 0] ?? 0;

  const getWeatherText = (code: number) => {
    const map: Record<number, string> = {
      0: "Ясно 🌞",
      1: "Сонячно з хмарами 🌤",
      2: "Хмарно",
      3: "Похмуро",
      71: "Сніг ❄️",
      85: "Сильний сніг ❄️☃️",
    };
    return map[code] || "Не відомо";
  };

  return (
    <Container>
      <WeatherHeadline
        city={data.misto}
        temperature={currentTemp}
        weather={currentCode}
        isFelt={currentFeels}
        MinTemperature={weather.daily.temperature_2m_min[0] ?? 0}
        MaxTemperature={weather.daily.temperature_2m_max[0] ?? 0}
      />

      <HourlyWeather days={weather} />

      <section className="mt-4">
        <h2 className="text-2xl font-semibold">Щоденні дані</h2>
        <table className="mt-2 border border-gray-300 w-full text-center">
          <thead>
            <tr>
              <th className="px-2 border">Дата</th>
              <th className="px-2 border">Макс.°C</th>
              <th className="px-2 border">Мін.°C</th>
              <th className="px-2 border">Опади мм</th>
              <th className="px-2 border">Погода</th>
            </tr>
          </thead>
          <tbody>
            {weather.daily.time.map((date: string, idx: number) => (
              <tr key={date}>
                <td className="px-2 border">{date}</td>
                <td className="px-2 border">
                  {Math.round(weather.daily.temperature_2m_max[idx] ?? 0)}
                </td>
                <td className="px-2 border">
                  {Math.round(weather.daily.temperature_2m_min[idx] ?? 0)}
                </td>
                <td className="px-2 border">
                  {weather.daily.precipitation_sum[idx] ?? 0}
                </td>
                <td className="px-2 border">
                  {getWeatherText(weather.daily.weathercode[idx] ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Container>
  );
}
