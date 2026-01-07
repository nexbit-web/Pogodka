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
        { nameUa: { contains: query, mode: "insensitive" } },
        { nameRu: { contains: query, mode: "insensitive" } },
        { nameEn: { contains: query, mode: "insensitive" } },
        { region: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      nameUa: true,
      nameRu: true,
      nameEn: true,
      region: true,
      latitude: true,
      longitude: true,
    },
    take: 5, // лимит, чтобы не перегружать
    orderBy: { nameEn: "asc" },
  });

  return NextResponse.json(cities);
}
