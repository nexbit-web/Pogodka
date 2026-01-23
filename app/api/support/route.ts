import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, subject, message } = await req.json();

  if (!email || !subject || !message) {
    return NextResponse.json(
      { error: "Заполнены не все поля" },
      { status: 400 },
    );
  }

  const text = `
🆘 Техпідтримка - Pogodka

Email: ${email}
Тема: ${subject}

${message}
  `;

  await fetch(
    `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TG_SUPPORT_CHAT_ID,
        text,
      }),
    },
  );

  return NextResponse.json({ success: true });
}
