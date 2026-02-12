import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fingerprint } from "@/lib/fingerprint";

export async function antiBot(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const fp = fingerprint(ip);

  const nowSec = Math.floor(Date.now() / 1000); // в секундах
  const BAN_TTL_SEC = 10 * 60; // 10 минут
  const MIN_INTERVAL_SEC = 0.5; // 0.5 секунды

  const ua = req.headers.get("user-agent")?.toLowerCase() || "";
  if (
    ua.includes("googlebot") ||
    ua.includes("bingbot") ||
    ua.includes("yandex") ||
    ua.includes("duckduckbot")
  ) {
    return null; // поисковые боты пропускаем
  }

  // 🔹 Очистка старых банов
  await prisma.botBan.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - BAN_TTL_SEC * 1000) } },
  });

  // 🔹 Очистка старых hit'ов (1 день)
  await prisma.botHit.deleteMany({
    where: { timestamp: { lt: nowSec - 24 * 60 * 60 } },
  });

  // 🔹 Проверка активного бана
  const ban = await prisma.botBan.findUnique({ where: { ip: fp } });
  if (ban) {
    const banEnd = Math.floor(ban.createdAt.getTime() / 1000) + BAN_TTL_SEC;
    if (nowSec < banEnd) {
      // Пользователь в бане → редирект на /banned
      return NextResponse.redirect("/banned");
    }
    // Если бан истёк — удаляем
    await prisma.botBan.delete({ where: { ip: fp } });
  }

  // 🔹 Проверка интервала между запросами
  const lastHit = await prisma.botHit.findUnique({ where: { ip: fp } });
  if (lastHit && nowSec - lastHit.timestamp < MIN_INTERVAL_SEC) {
    // Ставим бан в базе
    await prisma.botBan.upsert({
      where: { ip: fp },
      update: { reason: "Too fast", createdAt: new Date() },
      create: { ip: fp, reason: "Too fast", createdAt: new Date() },
    });

    // Редирект на /banned
    return NextResponse.redirect("/banned");
  }

  // 🔹 Сохраняем hit
  await prisma.botHit.upsert({
    where: { ip: fp },
    update: { timestamp: nowSec },
    create: { ip: fp, timestamp: nowSec },
  });

  return null;
}
