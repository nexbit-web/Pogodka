import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { BAN } from "@/config/ban";
import { DateTime } from "luxon";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!ip || ip === "unknown") return NextResponse.json(null, { status: 200 });

  const ban = await prisma.botBan.findFirst({ where: { ip } });
  if (!ban) return NextResponse.json(null, { status: 200 });

  // Текущее киевское время
  const nowKyiv = DateTime.now().setZone("Europe/Kyiv").toMillis();

  // Время окончания бана
  const banCreatedKyiv = DateTime.fromJSDate(ban.createdAt)
    .setZone("Europe/Kyiv")
    .toMillis();
  const banEnd = banCreatedKyiv + BAN.ttlSeconds * 1000;

  // Если бан закончился — удаляем его на сервере
  if (nowKyiv > banEnd) {
    await prisma.botBan.deleteMany({ where: { ip } });
    return NextResponse.json(null, { status: 200 });
  }

  // Иначе возвращаем данные о бане
  return NextResponse.json({
    ip,
    reason: ban.reason,
    banEnd, // timestamp по Киеву
  });
}
