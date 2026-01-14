import { Container } from "@/components/shared/Container";
import { HourlyWeather } from "@/components/shared/Hourly-weather";
import { WeatherHeadline } from "@/components/shared/Weather-headline";
import { WeeklyForecast } from "@/components/shared/Weekly-forecast";
import { CloudyDaySky } from "@/components/weather_backgrounds/Cloudy-day-sky";
import { NightCloudySky } from "@/components/weather_backgrounds/Night-cloudy-sky";
import { DateTime } from "luxon";
import { getCurrentWeather, CurrentWeather } from "@/utils/weather";
import { WindBlock } from "@/components/shared/WindBlock";
import { Visibility } from "@/components/shared/Visibility";
import { Humidity } from "@/components/shared/Humidity";

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
    <>
      {/* <NightCloudySky /> */}
      {/* <CloudyDaySky/> */}

      <Container className="relative z-10">
        <div className="flex flex-1 flex-col gap-6 p-0 sm:p-4 w-full">
          <WeatherHeadline
            city={data.misto}
            temperature={currentWeather.temp}
            weather={currentWeather.code}
            isFelt={currentWeather.feels}
            MinTemperature={weather.daily.temperature_2m_min[0] ?? 0}
            MaxTemperature={weather.daily.temperature_2m_max[0] ?? 0}
          />

          <HourlyWeather days={weather} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
            <div className="row-span-2 md:row-span-3">
              <WeeklyForecast days={weeklyDays} />
            </div>
            <div>
              <WindBlock
                WindValues={currentWeather.wind}
                GustsValues={currentWeather.gusts}
                DirectionValues={currentWeather.windDir ?? 0}
              />
            </div>
            <div className="">
              <Visibility VisibilityValues={currentWeather.visibility} />
            </div>

            <div className="">
              <Humidity
                HumidityValues={currentWeather.humidity}
                DewPointValues={currentWeather.dewPoint}
              />
            </div>
            {/* <div className="">
              
            </div> */}
          </div>
        </div>
      </Container>
    </>
  );
}
