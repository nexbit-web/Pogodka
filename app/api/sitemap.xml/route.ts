import { NextResponse } from "next/server";

const TOTAL_FILES = 5; // 25 000 городов / 5000

export async function GET() {
  const sitemaps = Array.from(
    { length: TOTAL_FILES },
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
