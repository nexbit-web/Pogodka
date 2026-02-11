import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CITIES_PER_FILE = 5000;

export async function GET() {
  const totalCities = await prisma.city.count();
  const numFiles = Math.ceil(totalCities / CITIES_PER_FILE);

  const sitemaps = Array.from(
    { length: numFiles },
    (_, i) => `
    <sitemap>
      <loc>https://www.pogodka.org/api/sitemap/${i + 1}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
    </sitemap>
  `,
  ).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
