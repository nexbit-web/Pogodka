// app/pohoda/[city]/page.tsx
import { WeatherLayout } from "@/components/shared/WeatherLayout";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { DateTime } from "luxon";
import { getCurrentWeather } from "@/utils/weather";

interface PageProps {
  params: Promise<{ city: string }>;
}

interface WeeklyDay {
  date: string;
  day: {
    code: number;
    mintemp_c: number;
    maxtemp_c: number;
  };
}

// 🔹 Динамические метаданные
export async function generateMetadata({ params }: PageProps) {
  const { city } = await params;
  const cityName = decodeURIComponent(city);

  const cityData = await prisma.city.findFirst({
    where: {
      OR: [
        { nameUa: { equals: cityName, mode: "insensitive" } },
        { nameRu: { equals: cityName, mode: "insensitive" } },
        { nameEn: { equals: cityName, mode: "insensitive" } },
        { slug: { equals: cityName, mode: "insensitive" } },
      ],
    },
    select: { nameUa: true, slug: true },
  });

  const titleCity = cityData?.nameUa ?? cityName;
  const slug = cityData?.slug ?? cityName;

  return {
    title: `POGODKA: Погода в ${titleCity} (Україна): температура, опади, вітер, вологість, тиск | Прогноз на тиждень`,
    description: `Актуальний прогноз погоди в місті ${titleCity}: температура, опади, вітер, хмарність, погодинний та 7-денний прогноз онлайн.`,

    canonical: `https://www.pogodka.org/pohoda/${slug}`,

    openGraph: {
      type: "website",
      locale: "uk_UA",
      url: `https://www.pogodka.org/pohoda/${slug}`,
      siteName: "Pogodka",
      title: `Pogodka — точний прогноз погоди в ${titleCity}`,
      description: `Актуальний прогноз погоди в місті ${titleCity}: температура, опади, вітер, хмарність, погодинний та 7-денний прогноз онлайн.`,
      images: [
        {
          url: "/og/main-weather.jpg",
          width: 1200,
          height: 630,
          alt: `Погода в ${titleCity} — Pogodka`,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: `Pogodka — точний прогноз погоди в ${titleCity}`,
      description: `Актуальний прогноз погоди в місті ${titleCity}: температура, опади, вітер, хмарність, погодинний та 7-денний прогноз онлайн.`,
      images: ["/og/main-weather.jpg"],
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },

    category: "weather",
  };
}

export default async function WeatherPage({ params }: PageProps) {
  const { city } = await params;
  const cityName = decodeURIComponent(city);

  // 🔹 fetch погоди
  // https://pogodka.vercel.app/
  const res = await fetch(
    `https://www.pogodka.org/api/pogoda?city=${encodeURIComponent(cityName)}`,
    { cache: "no-store" },
  );

  // 🔹 Якщо банований користувач → редирект на /banned
  if (res.status === 403 || res.status === 429) {
    // 🔹 користувач забанений ботом — редирект на сторінку бану
    return redirect("/banned");
  }

  // 🔹 если fetch упал по другой причине
  if (!res.ok) {
    return (
      <h1 className="text-center mt-10 text-red-500">
        Помилка при завантаженні даних
      </h1>
    );
  }

  const data = await res.json();

  // 🔹 вираховуємо currentWeather
  const kievNow = DateTime.now().setZone("Europe/Kyiv");
  const today = kievNow.toISODate()!;
  const currentHour = kievNow.hour;

  const hourIndex = data.weather.hourly.time.findIndex((time: string) => {
    const hour = DateTime.fromISO(time, { zone: "Europe/Kyiv" }).hour;
    return time.startsWith(today) && hour === currentHour;
  });

  const currentWeather = getCurrentWeather(data.weather, hourIndex);

  // 🔹 Формуємо 7-денний прогноз
  const weeklyDays: WeeklyDay[] = data.weather.daily.time.map(
    (date: string, idx: number) => ({
      date,
      day: {
        code: data.weather.daily.weathercode[idx] ?? 0,
        mintemp_c: data.weather.daily.temperature_2m_min[idx] ?? 0,
        maxtemp_c: data.weather.daily.temperature_2m_max[idx] ?? 0,
      },
    }),
  );

  // 🔹 JSON-LD для пошукачів
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "City",
    name: data.misto,
    url: `https://pogodka.ua/pohoda/${cityName}`,

    // Поточна погода
    weather: {
      "@type": "WeatherForecast",
      datePosted: kievNow.toISO(),
      description: `Поточний прогноз погоди в місті ${data.misto}`,
      temperature: {
        "@type": "QuantitativeValue",
        value: currentWeather.temp,
        unitCode: "CEL",
        name: "Температура",
      },
      windSpeed: {
        "@type": "QuantitativeValue",
        value: currentWeather.wind,
        unitCode: "KMH",
        name: "Швидкість вітру",
      },
      humidity: {
        "@type": "QuantitativeValue",
        value: currentWeather.humidity,
        unitCode: "P1",
        name: "Вологість",
      },
      feelsLike: {
        "@type": "QuantitativeValue",
        value: currentWeather.feels,
        unitCode: "CEL",
        name: "Відчувається як",
      },
    },

    // Прогноз на 7 днів
    dailyForecast: weeklyDays.map((day) => ({
      "@type": "WeatherForecast",
      datePosted: day.date,
      description: `Прогноз погоди на ${day.date} в місті ${data.misto}`,
      temperature: {
        "@type": "QuantitativeValue",
        minValue: day.day.mintemp_c,
        maxValue: day.day.maxtemp_c,
        unitCode: "CEL",
        name: "Температура (мін/макс)",
      },
      weatherCode: day.day.code,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WeatherLayout data={data} />
    </>
  );
}
