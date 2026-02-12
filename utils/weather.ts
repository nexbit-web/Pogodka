export type CurrentWeather = {
  temp: number;
  feels: number;
  dewPoint: number;
  code: number;
  windDir?: number;
  humidity: number;
  wind: number;
  gusts: number;
  visibility: number;
  precipitation: number;
  pressure: number;
};

export function getCurrentWeather(
  weather: any,
  hourIndex: number
): CurrentWeather {
  const index = hourIndex >= 0 ? hourIndex : 0;

  const {
    temperature_2m,
    apparent_temperature,
    dewpoint_2m,
    weathercode,
    relativehumidity_2m,
    windspeed_10m,
    windgusts_10m,
    visibility,
    precipitation,
    surface_pressure,
    pressure_msl,
  } = weather.hourly;

  return {
    temp: temperature_2m[index] ?? 0, // Поточна температура (°C)
    feels: apparent_temperature[index] ?? 0, // "Відчувається як" температура (°C)
    dewPoint: dewpoint_2m?.[index] ?? 0, // Точка роси (°C)
    code: weathercode[index] ?? 0, // Код погоди (для іконок)
    humidity: relativehumidity_2m[index] ?? 0, // Відносна вологість (%)
    wind: windspeed_10m[index] ?? 0, // Швидкість вітру (м/с)
    windDir: weather.hourly.winddirection_10m?.[index] ?? 0, // Напрямок вітру (градуси)
    gusts: windgusts_10m[index] ?? 0, // Пориви вітру (м/с)
    visibility: (visibility?.[index] ?? 0) / 1000, // Видимість (км)
    precipitation: precipitation?.[index] ?? 0, // Опади (мм)
    pressure: surface_pressure?.[index] ?? pressure_msl?.[index] ?? 0, // Атмосферний тиск (гПа)
  };
}
