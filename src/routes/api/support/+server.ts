import { json } from '@sveltejs/kit';
import { sendSupportMessage } from '$lib/server/support';
import { validateSupport } from '$lib/supportSchema';
import type { RequestHandler } from './$types';

// Приймає звернення в підтримку і пересилає його в Telegram
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);

	if (!body) {
		return json({ error: 'Некоректне тіло запиту' }, { status: 400 });
	}

	const values = {
		email: String(body.email ?? ''),
		subject: String(body.subject ?? ''),
		message: String(body.message ?? '')
	};

	const { valid, errors } = await validateSupport(values);
	if (!valid) {
		return json({ error: 'Заповнені не всі поля', errors }, { status: 400 });
	}

	try {
		await sendSupportMessage(values);
	} catch (err) {
		console.error('[support] Не вдалося надіслати повідомлення:', err);
		return json({ error: 'Помилка відправки' }, { status: 502 });
	}

	return json({ success: true });
};
