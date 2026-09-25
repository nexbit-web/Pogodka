import { env } from '$env/dynamic/private';

export interface SupportMessage {
	email: string;
	subject: string;
	message: string;
}

/** Надсилає звернення в Telegram-чат техпідтримки. */
export async function sendSupportMessage({ email, subject, message }: SupportMessage) {
	if (!env.TG_BOT_TOKEN || !env.TG_SUPPORT_CHAT_ID) {
		throw new Error('TG_BOT_TOKEN або TG_SUPPORT_CHAT_ID не задані');
	}

	const text = `
🆘 Техпідтримка - Pogodka

Email: ${email}
Тема: ${subject}

${message}
  `;

	const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ chat_id: env.TG_SUPPORT_CHAT_ID, text })
	});

	if (!res.ok) {
		throw new Error(`Telegram API повернув ${res.status}: ${await res.text()}`);
	}
}
