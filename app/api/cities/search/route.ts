import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
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
    take: 7,
    orderBy: { nameEn: "asc" },
  });

  return NextResponse.json(cities);
}
