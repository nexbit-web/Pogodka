import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { BAN } from "@/config/ban";
import { fingerprint } from "@/lib/fingerprint";

export async function GET(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const fp = fingerprint(ip);

    const banRecord = await prisma.botBan.findUnique({ where: { ip: fp } });

    // ❌ Бана немає
    if (!banRecord) return NextResponse.json(false);

    const banEnd = banRecord.createdAt.getTime() + BAN.ttlSeconds * 1000;

    // ⏱ Бан закінчився → видаляємо без помилок
    if (Date.now() >= banEnd) {
      await prisma.botBan.deleteMany({ where: { ip: fp } });
      return NextResponse.json(false);
    }

    // ✅ Бан активний — возвращаем причину
    return NextResponse.json({
      banned: true,
      banEnd,
      reason: banRecord.reason || "Без причини", // если нет reason, ставим дефолт
    });
  } catch (err) {
    console.error("Помилка в /api/get-ban:", err);
    return NextResponse.json(false, { status: 500 });
  }
}
