import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { redisGet, redisSet } from "@/lib/upstash";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cityName = searchParams.get("city");

  if (!cityName)
    return NextResponse.json({ error: "Не вказано місто" }, { status: 400 });

  //  ключ для кешування
  const key = cityName.toLowerCase().trim();

  // TTL 50 годин - 180000 секунд
  const TTL = 50 * 60 * 60;

  // перевіряємо кеш Redis
  const cached = await redisGet(key);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  // Пошук міста в БД
  const city = await prisma.city.findFirst({
    where: {
      OR: [
        { nameUa: { equals: cityName, mode: "insensitive" } },
        { nameRu: { equals: cityName, mode: "insensitive" } },
        { nameEn: { equals: cityName, mode: "insensitive" } },
        { slug: { equals: cityName, mode: "insensitive" } },
      ],
    },
    select: {
      nameUa: true,
      region: true,
      countryUa: true,
      latitude: true,
      longitude: true,
      slug: true,
    },
  });

  if (!city)
    return NextResponse.json({ error: "Місто не знайдено" }, { status: 404 });

  // Запит до Open-Meteo API за координатами міста
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}` +
    `&hourly=` +
    `temperature_2m,` +
    `apparent_temperature,` +
    `weathercode,` +
    `windspeed_10m,` +
    `windgusts_10m,` +
    `winddirection_10m,` +
    `relativehumidity_2m,` +
    `dewpoint_2m,` +
    `visibility,` +
    `precipitation,` +
    `pressure_msl` +
    `&daily=` +
    `temperature_2m_max,` +
    `temperature_2m_min,` +
    `precipitation_sum,` +
    `weathercode` +
    `&forecast_days=7` +
    `&timezone=Europe/Kyiv`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Не вийшло отримати дані погоди" },
      { status: 500 },
    );
  }

  const weather = await res.json();

  const data = {
    misto: city.nameUa,
    oblast: city.region,
    kraina: city.countryUa,
    latitude: city.latitude,
    longitude: city.longitude,
    weather,
  };

  // Зберігаємо результат у Redis з TTL
  await redisSet(key, JSON.stringify(data), TTL);

  return NextResponse.json(data);
}
