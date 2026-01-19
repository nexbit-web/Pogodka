import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cityName = searchParams.get("city");

  if (!cityName)
    return NextResponse.json({ error: "Не вказано місто" }, { status: 400 });

  // Шукаємо місто
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

  // Ми робимо запит до Open-Meteo
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
      { error: "Не удалось получить данные погоды" },
      { status: 500 },
    );
  }

  const weather = await res.json();

  return NextResponse.json({
    misto: city.nameUa,
    oblast: city.region,
    kraina: city.countryUa,
    latitude: city.latitude,
    longitude: city.longitude,
    weather,
  });
}
