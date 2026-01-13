import { Container } from "@/components/shared/Container";
import { HourlyWeather } from "@/components/shared/Hourly-weather";
import { WeatherHeadline } from "@/components/shared/Weather-headline";
import { WeeklyForecast } from "@/components/shared/Weekly-forecast";
import { CloudyDaySky } from "@/components/weather_backgrounds/Cloudy-day-sky";
import { NightCloudySky } from "@/components/weather_backgrounds/Night-cloudy-sky";
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
  weather: any;
}

export default async function WeatherPage({ params }: PageProps) {
  // Отримуємо назву міста з параметрів маршруту
  const { city } = await params;

  // Декодуємо назву міста
  const cityName = decodeURIComponent(city);

  // const baseUrl =
  //   process.env.NODE_ENV === "development"
  //     ? "http://localhost:3000"
  //     : process.env.VERCEL_URL
  //     ? `https://${process.env.VERCEL_URL}`
  //     : "https://pogodka.vercel.app";

  let data: ApiResponse;
  // https://pogodka.vercel.app
  // http://localhost:3000
  try {
    const apiRes = await fetch(
      `https://pogodka.vercel.app/api/pogoda?city=${encodeURIComponent(
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
  // Поточний час у Києві
  const kievNow = DateTime.now().setZone("Europe/Kyiv");
  const today = kievNow.toISODate()!;
  const currentHour = kievNow.hour;

  // Індекс поточного часу в масиві годин
  const hourIndex = weather.hourly.time.findIndex((time: string) => {
    const hour = DateTime.fromISO(time, { zone: "Europe/Kyiv" }).hour;
    return time.startsWith(today) && hour === currentHour;
  });

  // Поточна погода
  const currentTemp =
    weather.hourly.temperature_2m[hourIndex >= 0 ? hourIndex : 0] ?? 0;
  const currentFeels =
    weather.hourly.apparent_temperature[hourIndex >= 0 ? hourIndex : 0] ?? 0;
  const currentCode =
    weather.hourly.weathercode[hourIndex >= 0 ? hourIndex : 0] ?? 0;

  //  7 денний прогноз
  const weeklyDays = weather.daily.time.map((date: string, idx: number) => ({
    date,
    day: {
      code: weather.daily.weathercode[idx] ?? 0,
      mintemp_c: weather.daily.temperature_2m_min[idx] ?? 0,
      maxtemp_c: weather.daily.temperature_2m_max[idx] ?? 0,
    },
  }));

  return (
    <>
      {/* <NightCloudySky /> */}
      {/* <CloudyDaySky/> */}
      <Container className="relative z-10">
        <div className="flex flex-1 flex-col gap-6 p-0 sm:p-4 w-full">
          <WeatherHeadline
            city={data.misto}
            temperature={currentTemp}
            weather={currentCode}
            isFelt={currentFeels}
            MinTemperature={weather.daily.temperature_2m_min[0] ?? 0}
            MaxTemperature={weather.daily.temperature_2m_max[0] ?? 0}
          />

          <HourlyWeather days={weather} />

          {/* <section className="mt-4">
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
        </section> */}

          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <WeeklyForecast days={weeklyDays} />
          </div>
        </div>
      </Container>
    </>
  );
}
