import React from "react";

interface Props {
  className?: string;
  city: string;
  temperature: number;
  weather: number;
  isFelt: number;
  MinTemperature: number;
  MaxTemperature: number;
}

export const WeatherHeadline: React.FC<Props> = ({
  className,
  city,
  temperature,
  weather,
  isFelt,
  MinTemperature,
  MaxTemperature,
}) => {
  const getWeatherText = (code: number) => {
    const map: Record<number, string> = {
      0: "Ясно",
      1: "Майже ясно",
      2: "Частково хмарно",
      3: "Пасмурно",
      45: "Туман",
      48: "Інеєвий туман",
      51: "Легка мряка",
      53: "Мряка",
      55: "Сильна мряка",
      61: "Легкий дощ",
      63: "Помірний дощ",
      65: "Сильний дощ",
      66: "Легкий замерзаючий дощ",
      67: "Сильний замерзаючий дощ",
      71: "Легкий сніг",
      73: "Сніг",
      75: "Сильний сніг",
      77: "Сніжинки",
      80: "Легкі зливи",
      81: "Помірні зливи",
      82: "Сильні зливи",
      85: "Легкий снігопад",
      86: "Сильний снігопад",
      95: "Гроза",
      96: "Гроза з невеликим градом",
      99: "Гроза з великим градом",
    };
    return map[code] || "Невідомо";
  };
  return (
    <div className={className}>
      {/* Блок поточної погоди */}
      <section
        className="flex flex-col items-center gap-2 mt-9 mb-9"
        aria-labelledby="current-weather-title"
      >
        {/* Назва міста */}
        <h1
          id="current-weather-title"
          className="text-3xl font-bold text-shadow"
          style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
        >
          {city}
        </h1>

        {/* Поточна температура */}
        <p
          className="text-7xl font-semibold"
          style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
          aria-label={`Поточна температура ${temperature ? Math.round(temperature) : "--"} градусів`}
        >
          {temperature ? `${Math.round(temperature)}°` : "--"}
        </p>

        {/* Поточний стан погоди */}
        <p
          className="text-lg text-shadow-muted-foreground text-shadow text-center"
          style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
        >
          {`${getWeatherText(weather)}, відчувається як ${Math.round(isFelt)}°`}
        </p>

        {/* Мінімальна та максимальна температура */}
        <dl
          className="flex gap-4 text-lg"
          style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.2)" }}
        >
          <div>
            <dt className="sr-only">Максимальна температура</dt>
            <dd>В: {Math.round(MaxTemperature)}°</dd>
          </div>
          <div>
            <dt className="sr-only">Мінімальна температура</dt>
            <dd>Н: {Math.round(MinTemperature)}°</dd>
          </div>
        </dl>
      </section>
    </div>
  );
};
