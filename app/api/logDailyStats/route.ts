// app/api/logDailyStats/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fingerprint } from "@/lib/fingerprint";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ua = req.headers.get("user-agent") || "unknown";
    const fp = fingerprint(ip);
    const path = new URL(req.url).pathname;

    // 🔹 Проверяем, что это не бот
    const isBot = /bot|crawl|spider|bingpreview/i.test(ua);
    if (isBot) return NextResponse.json({ ok: true }); // игнорируем ботов

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🔹 Создаем запись запроса
    await prisma.securityRequestLog.create({
      data: {
        ip,
        fingerprint: fp,
        path,
        method: "POST",
        userAgent: ua,
        createdAt: now,
      },
    });

    // 🔹 Обновляем ежедневную статистику
    const existingStats = await prisma.securityDailyStats.findUnique({
      where: { date: today },
    });

    if (!existingStats) {
      // 🔹 Если статистики за сегодня нет
      await prisma.securityDailyStats.create({
        data: {
          date: today,
          requests: 1,
          uniqueUsers: 1, // первый пользователь
          bots: 0,
        },
      });
    } else {
      // 🔹 Проверяем, был ли уже такой пользователь сегодня
      const alreadyCounted = await prisma.securityRequestLog.findFirst({
        where: {
          fingerprint: fp,
          createdAt: {
            gte: today,
          },
        },
      });

      await prisma.securityDailyStats.update({
        where: { date: today },
        data: {
          requests: { increment: 1 },
          uniqueUsers: alreadyCounted ? undefined : { increment: 1 },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("LogDailyStats error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
