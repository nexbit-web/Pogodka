import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cities = await prisma.city.findMany({
    select: {
      slug: true,
    },
  });

  const cityUrls: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `https://www.pogodka.org/${city.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    {
      url: "https://www.pogodka.org",
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...cityUrls,
  ];
}
