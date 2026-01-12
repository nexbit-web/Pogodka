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
  weather: any; // тут весь объект Open-Meteo
}

export default async function WeatherPage({ params }: PageProps) {

const kievNow = DateTime.now().setZone("Europe/Kiev");
const today = kievNow.toFormat("yyyy-MM-dd"); // string
const currentHour = kievNow.hour;

  const { city: encodedCityName } = await params;
  const cityName = decodeURIComponent(encodedCityName);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://pogodka.vercel.app";

  const apiRes = await fetch(
    `${baseUrl}/api/pogoda?city=${encodeURIComponent(cityName)}`,
    { cache: "no-store" }
  );

  if (!apiRes.ok) return <h1>Не удалось получить данные погоды</h1>;

  const data: ApiResponse = await apiRes.json();
  if ((data as any).error) return <h1>{(data as any).error}</h1>;

  const { weather } = data;

  const getWeatherText = (code: number) => {
    const map: Record<number, string> = {
      0: "Ясно 🌞",
      1: "Солнечно с облаками 🌤",
      2: "Облачно",
      3: "Пасмурно",
      71: "Снег ❄️",
      85: "Сильный снег ❄️☃️",
    };
    return map[code] || "Неизвестно";
  };

  // знайти індекс поточного часу
const hourIndex = weather.hourly.time.findIndex(
  (time: string | null) =>
    time !== null &&
    time.startsWith(today) &&
    DateTime.fromISO(time).hour === currentHour
);
  // Берем поточну погоду з першого елемента погодинного масиву, якщо індекс не знайдено
  const currentTemp =
    hourIndex >= 0
      ? weather.hourly.temperature_2m[hourIndex]
      : weather.hourly.temperature_2m[0];
  const currentFeels =
    hourIndex >= 0
      ? weather.hourly.apparent_temperature[hourIndex]
      : weather.hourly.apparent_temperature[0];
  const currentCode =
    hourIndex >= 0
      ? weather.hourly.weathercode[hourIndex]
      : weather.hourly.weathercode[0];

  return (
    <Container>
      <WeatherHeadline
        city={data.misto}
        temperature={currentTemp}
        weather={currentCode}
        isFelt={currentFeels}
        MinTemperature={weather.daily.temperature_2m_min[0]}
        MaxTemperature={weather.daily.temperature_2m_max[0]}
      />

      <HourlyWeather days={weather} />

      <section className="mt-4">
        <h2 className="text-2xl font-semibold">Щоденні дані</h2>
        <table className="mt-2 border border-gray-300">
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
                  {Math.round(weather.daily.temperature_2m_max[idx])}
                </td>
                <td className="px-2 border">
                  {Math.round(weather.daily.temperature_2m_min[idx])}
                </td>
                <td className="px-2 border">
                  {weather.daily.precipitation_sum[idx]}
                </td>
                <td className="px-2 border">
                  {getWeatherText(weather.daily.weathercode[idx])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Container>
  );
}
