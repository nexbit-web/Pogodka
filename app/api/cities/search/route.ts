import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Кэшируем популярные города (1 час)
let popularCitiesCache: any[] | null = null;
let popularCacheTime = 0;

const POPULAR_SLUGS = [
  "kyiv",
  "kharkiv",
  "odesa",
  "dnipro",
  "donetsk",
  "zaporizhzhia",
  "lviv",
  "kryvyi-rih",
  "mykolaiv",
  "mariupol",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  // Без запроса — вернуть популярные города
  if (!query || query.length < 2) {
    const now = Date.now();
    if (!popularCitiesCache || now - popularCacheTime > 3600_000) {
      popularCitiesCache = await prisma.city.findMany({
        where: { slug: { in: POPULAR_SLUGS } },
        select: {
          id: true,
          slug: true,
          nameUa: true,
          nameRu: true,
          nameEn: true,
          region: true,
          latitude: true,
          longitude: true,
        },
      });
      // Сортируем в нужном порядке
      popularCitiesCache.sort(
        (a, b) => POPULAR_SLUGS.indexOf(a.slug) - POPULAR_SLUGS.indexOf(b.slug),
      );
      popularCacheTime = now;
    }
    return NextResponse.json(popularCitiesCache, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  const cities = await prisma.city.findMany({
    where: {
      OR: [
        { nameUa: { startsWith: query, mode: "insensitive" } },
        { nameRu: { startsWith: query, mode: "insensitive" } },
        { nameEn: { startsWith: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      nameUa: true,
      nameRu: true,
      nameEn: true,
      region: true,
      latitude: true,
      longitude: true,
    },
    take: 20,  
    orderBy: { nameEn: "asc" },
  });

  return NextResponse.json(cities, {
    headers: {
      // Короткий кэш для поиска
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
