"use client";
import { Container } from "@/components/shared/Container";
import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Condition = {
  text: string;
  icon: string;
};

type Hour = {
  time: string;
  temp_c: number;
  condition: Condition;
};

type Day = {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    condition: Condition;
  };
  hour: Hour[];
};

type CurrentWeather = {
  temp_c: number;
  feelslike_c: number;
  condition: {
    text: string;
    icon: string;
  };
  humidity: number;
  wind_kph: number;
};

export default function Home() {
  const [days, setDays] = useState<Day[]>([]);
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const currentHourRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch(
      "https://api.weatherapi.com/v1/forecast.json?key=9bba8ac20f324fab876193656252310&q=46.8486,30.0792&days=7&lang=uk"
    )
      .then((res) => res.json())
      .then((data) => {
        setDays(data.forecast.forecastday); // прогноз на 7 днів
        setCurrent(data.current); // поточна погода
        setLocation(data.location); // назва міста
      })
      .catch(console.error);
  }, []);

  // Прокрутка до поточного часу
  useEffect(() => {
    if (currentHourRef.current) {
      currentHourRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [days]);

  const now = new Date();
  const currentHour = now.getHours();

  // Функція для дня неділі
  function getDayLabel(dateString: string) {
    const today = new Date();
    const date = new Date(dateString);

    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return "Сьогодні";
    if (date.getTime() === today.getTime() + 86400000) return "Завтра";

    return date.toLocaleDateString("uk-UA", { weekday: "long" });
  }

  return (
    <>
      <Container>
        <div className="flex flex-1 flex-col gap-6 p-0 sm:p-4 w-full">
          <div className="flex mt-9 mb-9 flex-col items-center">
            <h1 className="text-3xl font-bold text-shadow">
              {location ? location.name : "--"}
            </h1>

            {/* Поточна температура */}
            <h2 className="text-7xl">
              {current ? `${Math.round(current.temp_c)}°` : "--"}
            </h2>

            {/* Погода зараз */}
            <p className="text-lg text-muted-foreground text-shadow">
              {current
                ? `${current.condition.text}, відчувається як ${Math.round(
                    current.feelslike_c
                  )}°`
                : "--"}
            </p>

            {/* Мінімум/максимум сьогодні з прогнозу */}
            <div className="flex gap-4 text-lg text-shadow">
              {days[0] ? (
                <>
                  <p>B: {Math.round(days[0].day.mintemp_c)}°</p>{" "}
                  {/* мінімальна температура */}
                  <p>H: {Math.round(days[0].day.maxtemp_c)}°</p>
                </>
              ) : (
                <p>--</p>
              )}
            </div>
          </div>
          <div className="">
            <div
              className="flex justify-between bg-muted/50 rounded-4xl overflow-x-auto scroll-on-hover"
              style={{ scrollBehavior: "smooth" }} // плавная прокрутка
            >
              {days.length > 0 &&
                days[0].hour.slice(0, 24).map((hour: any) => {
                  const hourTime = new Date(hour.time).getHours();
                  const isCurrent = hourTime === currentHour;

                  return (
                    <div
                      key={hour.time}
                      ref={isCurrent ? currentHourRef : null}
                      className={`flex flex-col items-center hover:bg-muted/70 rounded-xl text-shadow flex-shrink-0 py-3 ${
                        isCurrent ? "bg-[color:var(--primary)] text-white" : ""
                      }`}
                    >
                      <p className="text-sm font-medium">{hourTime}:00</p>
                      <img
                        src={`https:${hour.condition.icon}`}
                        alt="Weather icon"
                        className="w-12 h-12"
                      />
                      <p className="text-lg font-semibold">
                        {Math.round(Number(hour.temp_c))}°
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>

          
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-4xl">
              <span className="flex gap-1 items-center pl-5 pt-2 font-medium   text-muted-foreground">
                <CalendarDays size={20} /> 7-денний прогноз
              </span>
              {days.map((day) => (
                <div
                  key={day.date}
                  className="flex justify-around border-t mt-2 pt-2"
                >
                  <h3 className="capitalize">{getDayLabel(day.date)}</h3>
                  <img
                    className="w-8 h-8"
                    src={`https:${day.day.condition.icon}`}
                    alt={day.day.condition.text}
                  />
                  <span>
                    B: {Math.round(day.day.mintemp_c)}° / H:{" "}
                    {Math.round(day.day.maxtemp_c)}°
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-muted/50 aspect-video rounded-4xl" />
            <div className="bg-muted/50 aspect-video rounded-4xl" />
          </div>
        </div>
      </Container>
    </>
  );
}
