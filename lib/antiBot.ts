import { BAN } from "@/config/ban";
import prisma from "@/lib/prisma";

export async function antiBot(req: Request, city: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const ua = req.headers.get("user-agent")?.toLowerCase() || "";

  const now = Math.floor(Date.now() / 1000); // timestamp в секундах

  // ======================
  // 🔹 Все TTL
  // ======================
  const BAN_TTL = BAN.ttlSeconds; // берется из конфигурации
  const BOT_HIT_TTL = 24 * 60 * 60; // время жизни хита для ограничения скорости (24 часа)
  const CITY_HIT_TTL = 10 * 60; // время жизни хита по городам (10 минут)

  // ======================
  // SEO WHITELIST
  // ======================
  const isSearchBot =
    ua.includes("googlebot") ||
    ua.includes("bingbot") ||
    ua.includes("yandex") ||
    ua.includes("duckduckbot");

  if (isSearchBot) return null; // поисковиков пропускаем

  // ======================
  // Чистим устаревшие данные
  // ======================
  const expiredBan = new Date(Date.now() - BAN_TTL * 1000);
  await prisma.botBan.deleteMany({ where: { createdAt: { lt: expiredBan } } });

  await prisma.botHit.deleteMany({
    where: { timestamp: { lt: now - BOT_HIT_TTL } },
  });
  await prisma.botCityHit.deleteMany({
    where: { timestamp: { lt: now - CITY_HIT_TTL } },
  });

  // ======================
  // 1️⃣ Soft-ban
  // ======================
  const ban = await prisma.botBan.findUnique({ where: { ip } });
  if (ban) return new Response("Blocked", { status: 403 });

  // ======================
  // 2️⃣ Ограничение скорости
  // ======================
  const lastHit = await prisma.botHit.findUnique({ where: { ip } });
  if (lastHit && now - lastHit.timestamp < 1) {
    await prisma.botBan.upsert({
      where: { ip },
      update: { reason: "Too fast" },
      create: { ip, reason: "Too fast" },
    });
    return new Response("Too fast, banned", { status: 429 });
  }

  await prisma.botHit.upsert({
    where: { ip },
    update: { timestamp: now },
    create: { ip, timestamp: now },
  });

  // ======================
  // 3️⃣ Лимит уникальных городов
  // ======================
  const recentCities = await prisma.botCityHit.findMany({
    where: { ip, timestamp: { gte: now - CITY_HIT_TTL } },
  });

  const uniqueCities = Array.from(new Set(recentCities.map((c) => c.city)));
  if (!uniqueCities.includes(city) && uniqueCities.length >= 2) {
    await prisma.botBan.upsert({
      where: { ip },
      update: { reason: "Too many unique cities" },
      create: { ip, reason: "Too many unique cities" },
    });
    return new Response("Too many unique cities, banned", { status: 429 });
  }

  await prisma.botCityHit.create({
    data: { ip, city, timestamp: now },
  });

  // ======================
  // 4️⃣ Анти-алфавитный перебор
  // ======================
  const lastCityHit = recentCities.sort((a, b) => b.timestamp - a.timestamp)[0];
  if (lastCityHit && city > lastCityHit.city && city.length > 3) {
    const alphaHits = recentCities.filter(
      (c) => c.city > lastCityHit.city && c.city.length > 3,
    );
    if (alphaHits.length >= 3) {
      await prisma.botBan.upsert({
        where: { ip },
        update: { reason: "Alphabetical scan" },
        create: { ip, reason: "Alphabetical scan" },
      });
      return new Response("Alphabetical scan detected, banned", {
        status: 429,
      });
    }
  }

  return null;
}
