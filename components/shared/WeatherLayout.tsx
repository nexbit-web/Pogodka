import { Container } from "./Container";
import { WeeklyForecast } from "./Weekly-forecast";
import { HourlyWeather } from "./Hourly-weather";
import { WeatherHeadline } from "./Weather-headline";
import { WindBlock } from "./WindBlock";
import { Humidity } from "./Humidity";
import { Precipitation } from "./Precipitation";
import { Visibility } from "./Visibility";
import { Pressure } from "./Atmospheric-pressure";
import { Footer } from "./Footer";
import { DateTime } from "luxon";
import { getCurrentWeather, CurrentWeather } from "@/utils/weather";

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
