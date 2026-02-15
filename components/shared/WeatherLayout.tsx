"use client";
import { Container } from "./Container";
import { WeatherHeadline } from "./Weather-headline";
import { DateTime } from "luxon";
import { getCurrentWeather, CurrentWeather } from "@/utils/weather";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import HourlyWeather from "./Hourly-weather";
import { Footer } from "./Footer";
import { WeatherAnalytics } from "./WeatherAnalytics";

// Динамічний імпорт компонентів з скелетонами для SSR
const WeeklyForecast = dynamic(() => import("./Weekly-forecast"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-74" />,
});

const WindBlock = dynamic(() => import("./WindBlock"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});
const Humidity = dynamic(() => import("./Humidity"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-33" />,
});
const Precipitation = dynamic(() => import("./Precipitation"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});
const Visibility = dynamic(() => import("./Visibility"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});
const Pressure = dynamic(() => import("./Pressure"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-37" />,
});

interface WeatherLayoutProps {
  data: any;
}

export function WeatherLayout({ data }: WeatherLayoutProps) {
  const { weather } = data;

  const kievNow = DateTime.now().setZone("Europe/Kyiv");
  const today = kievNow.toISODate()!;
  const currentHour = kievNow.hour;

  const hourIndex = weather.hourly.time.findIndex((time: string) => {
    const hour = DateTime.fromISO(time, { zone: "Europe/Kyiv" }).hour;
    return time.startsWith(today) && hour === currentHour;
  });

  const currentWeather: CurrentWeather = getCurrentWeather(weather, hourIndex);

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
      {/*Основний зміст SSR - ми показуємо його одразу*/}
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
          {/* Вологість */}
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
      {/* Аналітіка */}
      {/* <WeatherAnalytics /> */}
      <Footer />
    </Container>
  );
}
