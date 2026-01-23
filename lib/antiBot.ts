import { DateTime } from "luxon";
import { BAN } from "@/config/ban";
import prisma from "@/lib/prisma";

export async function antiBot(req: Request, city: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const ua = req.headers.get("user-agent")?.toLowerCase() || "";

  // 🔹 Текущее киевское время в формате Date
  const nowKyivDate = DateTime.now().setZone("Europe/Kyiv").toJSDate();
  const nowKyivSeconds = Math.floor(DateTime.now().setZone("Europe/Kyiv").toSeconds());

  // ======================
  // TTL
  // ======================
  const BAN_TTL = BAN.ttlSeconds; // TTL для бана
  const BOT_HIT_TTL = 24 * 60 * 60; // 24 часа для ограничения скорости
  const CITY_HIT_TTL = 10 * 60; // 10 минут для городов

  // ======================
  // SEO WHITELIST
  // ======================
  const isSearchBot =
    ua.includes("googlebot") ||
    ua.includes("bingbot") ||
    ua.includes("yandex") ||
    ua.includes("duckduckbot");
  if (isSearchBot) return null;

  // ======================
  // Чистим устаревшие данные
  // ======================
  const expiredBanDate = DateTime.now().setZone("Europe/Kyiv").minus({ seconds: BAN_TTL }).toJSDate();

  await prisma.botBan.deleteMany({
    where: { createdAt: { lt: expiredBanDate } },
  });

  await prisma.botHit.deleteMany({
    where: { timestamp: { lt: nowKyivSeconds - BOT_HIT_TTL } },
  });

  await prisma.botCityHit.deleteMany({
    where: { timestamp: { lt: nowKyivSeconds - CITY_HIT_TTL } },
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
  if (lastHit && nowKyivSeconds - lastHit.timestamp < 1) {
    await prisma.botBan.upsert({
      where: { ip },
      update: { reason: "Too fast", createdAt: nowKyivDate },
      create: { ip, reason: "Too fast", createdAt: nowKyivDate },
    });
    return new Response("Too fast, banned", { status: 429 });
  }

  await prisma.botHit.upsert({
    where: { ip },
    update: { timestamp: nowKyivSeconds },
    create: { ip, timestamp: nowKyivSeconds },
  });

  // ======================
  // 3️⃣ Лимит уникальных городов
  // ======================
  const recentCities = await prisma.botCityHit.findMany({
    where: { ip, timestamp: { gte: nowKyivSeconds - CITY_HIT_TTL } },
  });

  const uniqueCities = Array.from(new Set(recentCities.map((c) => c.city)));
  if (!uniqueCities.includes(city) && uniqueCities.length >= 2) {
    await prisma.botBan.upsert({
      where: { ip },
      update: { reason: "Too many unique cities", createdAt: nowKyivDate },
      create: { ip, reason: "Too many unique cities", createdAt: nowKyivDate },
    });
    return new Response("Too many unique cities, banned", { status: 429 });
  }

  await prisma.botCityHit.create({
    data: { ip, city, timestamp: nowKyivSeconds },
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
        update: { reason: "Alphabetical scan", createdAt: nowKyivDate },
        create: { ip, reason: "Alphabetical scan", createdAt: nowKyivDate },
      });
      return new Response("Alphabetical scan detected, banned", { status: 429 });
    }
  }

  return null;
}
