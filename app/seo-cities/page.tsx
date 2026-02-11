// app/seo-cities/page.tsx
import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-static"; // Страница полностью статическая на этапе билда

const GROUP_SIZE = 50; // сколько городов на одну группу (можно менять)

export default async function SeoCitiesPage() {
  const cities = await prisma.city.findMany({
    select: { nameUa: true, slug: true },
    orderBy: { nameUa: "asc" },
  });

  // 🔹 Разбиваем на группы
  const groups: { nameUa: string; slug: string }[][] = [];
  for (let i = 0; i < cities.length; i += GROUP_SIZE) {
    groups.push(cities.slice(i, i + GROUP_SIZE));
  }

  // 🔹 JSON-LD для всех городов
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: cities.map((city, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: city.nameUa,
      url: `https://pogodka.ua/pohoda/${city.slug}`,
      description: `На сторінці ${city.nameUa} можна дізнатися температуру, опади, вітер, хмарність та прогноз на 7 днів.`,
    })),
  };

  return (
    <>
      <h1 className="sr-only">Список міст України — SEO для Pogodka</h1>

      {groups.map((group, idx) => (
        <section key={idx}>
          <ul>
            {group.map((city) => (
              <li key={city.slug}>
                <Link href={`/pohoda/${city.slug}`}>{city.nameUa}</Link>
                <p>Погода, температура, опади, вітер та прогноз на 7 днів.</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
