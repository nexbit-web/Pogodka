import prisma from "@/lib/prisma";
import { BAN } from "@/config/ban";
import { fingerprint } from "@/lib/fingerprint";

export async function antiBot(req: Request, city: string) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // 🔹 fingerprint ТОЛЬКО от IP
  const fp = fingerprint(ip);

  const nowUtcMs = Date.now();
  const nowUtcSeconds = Math.floor(nowUtcMs / 1000);
  const nowUtcDate = new Date(nowUtcMs);

  const BAN_TTL = BAN.ttlSeconds;
  const BOT_HIT_TTL = 24 * 60 * 60;
  const CITY_HIT_TTL = 10 * 60;

  const ua = req.headers.get("user-agent")?.toLowerCase() || "";
  const isSearchBot =
    ua.includes("googlebot") ||
    ua.includes("bingbot") ||
    ua.includes("yandex") ||
    ua.includes("duckduckbot");
  if (isSearchBot) return null;

  // 🧹 Очистка застарілих даних
  await prisma.botBan.deleteMany({
    where: { createdAt: { lt: new Date(nowUtcMs - BAN_TTL * 1000) } },
  });
  await prisma.botHit.deleteMany({
    where: { timestamp: { lt: nowUtcSeconds - BOT_HIT_TTL } },
  });
  await prisma.botCityHit.deleteMany({
    where: { timestamp: { lt: nowUtcSeconds - CITY_HIT_TTL } },
  });

  // 🚫 Перевірка бану
  const ban = await prisma.botBan.findUnique({ where: { ip: fp } });
  if (ban) {
    const banEndMs = ban.createdAt.getTime() + BAN_TTL * 1000;
    if (Date.now() < banEndMs) {
      return new Response("Blocked", { status: 403 });
    }
    await prisma.botBan.delete({ where: { ip: fp } });
  }

  // ⚡ Rate limit
  const lastHit = await prisma.botHit.findUnique({ where: { ip: fp } });
  if (lastHit && nowUtcSeconds - lastHit.timestamp < 1) {
    await prisma.botBan.upsert({
      where: { ip: fp },
      update: { reason: "Too fast", createdAt: nowUtcDate },
      create: { ip: fp, reason: "Too fast", createdAt: nowUtcDate },
    });
    return new Response("Too fast, banned", { status: 429 });
  }

  await prisma.botHit.upsert({
    where: { ip: fp },
    update: { timestamp: nowUtcSeconds },
    create: { ip: fp, timestamp: nowUtcSeconds },
  });

  // 🌍 Ліміт унікальних міст
  const recentCities = await prisma.botCityHit.findMany({
    where: {
      ip: fp,
      timestamp: { gte: nowUtcSeconds - CITY_HIT_TTL },
    },
  });
  const uniqueCities = Array.from(new Set(recentCities.map((c) => c.city)));
  if (!uniqueCities.includes(city) && uniqueCities.length >= 15) {
    await prisma.botBan.upsert({
      where: { ip: fp },
      update: { reason: "Too many unique cities", createdAt: nowUtcDate },
      create: {
        ip: fp,
        reason: "Too many unique cities",
        createdAt: nowUtcDate,
      },
    });
    return new Response("Too many unique cities, banned", { status: 429 });
  }

  await prisma.botCityHit.create({
    data: { ip: fp, city, timestamp: nowUtcSeconds },
  });

  // 🔤 Анти-алфавітний перебір
  const lastCityHit = recentCities.sort((a, b) => b.timestamp - a.timestamp)[0];
  if (lastCityHit && city > lastCityHit.city && city.length > 3) {
    const alphaHits = recentCities.filter(
      (c) => c.city > lastCityHit.city && c.city.length > 3,
    );
    if (alphaHits.length >= 3) {
      await prisma.botBan.upsert({
        where: { ip: fp },
        update: { reason: "Alphabetical scan", createdAt: nowUtcDate },
        create: { ip: fp, reason: "Alphabetical scan", createdAt: nowUtcDate },
      });
      return new Response("Alphabetical scan detected, banned", {
        status: 429,
      });
    }
  }

  return null;
}
