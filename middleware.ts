import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/banned") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Проверяем бан через API
  const checkUrl = new URL("/api/get-ban", req.url);
  const res = await fetch(checkUrl, {
    headers: {
      "x-forwarded-for": req.headers.get("x-forwarded-for") || "",
    },
    cache: "no-store",
  });

  const ban = await res.json();

  if (ban) {
    const url = req.nextUrl.clone();
    url.pathname = "/banned";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
