import { Container } from "@/components/shared/Container";
import { HourlyWeather } from "@/components/shared/Hourly-weather";
import { WeatherHeadline } from "@/components/shared/Weather-headline";
import { WeeklyForecast } from "@/components/shared/Weekly-forecast";
import { DateTime } from "luxon";
import { getCurrentWeather, CurrentWeather } from "@/utils/weather";
import { WindBlock } from "@/components/shared/WindBlock";
import { Visibility } from "@/components/shared/Visibility";
import { Humidity } from "@/components/shared/Humidity";
import { Precipitation } from "@/components/shared/Precipitation";
import { Pressure } from "@/components/shared/Atmospheric-pressure";
import { Footer } from "@/components/shared/Footer";

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

  let data: ApiResponse;
  // https://pogodka.vercel.app
  // http://localhost:3000
  try {
    const apiRes = await fetch(
      `http://localhost:3000/api/pogoda?city=${encodeURIComponent(cityName)}`,
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

  const currentWeather: CurrentWeather = getCurrentWeather(weather, hourIndex);

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
    <Container className="relative z-10">
      <WeatherHeadline
        city={data.misto}
        temperature={currentWeather.temp}
        weather={currentWeather.code}
        isFelt={currentWeather.feels}
        MinTemperature={weather.daily.temperature_2m_min[0] ?? 0}
        MaxTemperature={weather.daily.temperature_2m_max[0] ?? 0}
      />

      <div className="container">
        <div className="card post-card">
          <WeeklyForecast days={weeklyDays} />
        </div>

        <div className="card todo-card-2">
          <HourlyWeather days={weather} />
        </div>

        <div className="card messages-card-3">
          <WindBlock
            WindValues={currentWeather.wind}
            GustsValues={currentWeather.gusts}
            DirectionValues={currentWeather.windDir ?? 0}
          />
        </div>

        <div className="card welcome-card-4">
          <Humidity
            HumidityValues={currentWeather.humidity}
            DewPointValues={currentWeather.dewPoint}
          />
        </div>

        <div className="card friends-card-5">
          <Precipitation PrecipitationValues={currentWeather.precipitation} />
        </div>

        <div className="card contact-card-6">
          <Visibility VisibilityValues={currentWeather.visibility} />
        </div>

        <div className="card contact-card-7">
          <Pressure PressureValues={currentWeather.pressure} />
        </div>
      </div>
      <Footer />
    </Container>
  );
}
