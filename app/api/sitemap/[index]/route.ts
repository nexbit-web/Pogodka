import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CITIES_PER_FILE = 5000;

export async function GET(
  _req: Request,
  context: { params: Promise<{ index: string }> }
) {
  const { index } = await context.params; // 🔹 теперь await
  const fileIndex = parseInt(index, 10) - 1;

  const cities = await prisma.city.findMany({
    select: { slug: true },
    skip: fileIndex * CITIES_PER_FILE,
    take: CITIES_PER_FILE,
    orderBy: { id: "asc" },
  });

  const now = new Date().toISOString();

  const urls = cities
    .map(
      (city) => `
  <url>
    <loc>https://www.pogodka.org/pohoda/${city.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}