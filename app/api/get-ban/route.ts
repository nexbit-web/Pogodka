import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { BAN } from "@/config/ban";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!ip || ip === "unknown") return NextResponse.json(null, { status: 200 });

  const ban = await prisma.botBan.findFirst({ where: { ip } });
  if (!ban) return NextResponse.json(null, { status: 200 });

  const banEnd = ban.createdAt.getTime() + BAN.ttlSeconds * 1000;

  // Если бан закончился, удаляем запись
  if (Date.now() > banEnd) {
    await prisma.botBan.deleteMany({ where: { ip } });
    return NextResponse.json(null, { status: 200 });
  }

  return NextResponse.json({
    ip,
    reason: ban.reason,
    banEnd,
  });
}
