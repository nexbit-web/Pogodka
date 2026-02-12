import { NextResponse } from "next/server";

// Цей API-роут приймає POST-запити з даними форми підтримки і надсилає їх у Telegram-чат техпідтримки.
export async function POST(req: Request) {
  const { email, subject, message } = await req.json();

  if (!email || !subject || !message) {
    return NextResponse.json(
      { error: "Заповнені не всі поля" },
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
