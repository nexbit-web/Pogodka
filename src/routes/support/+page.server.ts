import { fail } from '@sveltejs/kit';
import { sendSupportMessage } from '$lib/server/support';
import { validateSupport } from '$lib/supportSchema';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();

		const values = {
			email: String(form.get('email') ?? ''),
			subject: String(form.get('subject') ?? ''),
			message: String(form.get('message') ?? '')
		};

		// Сервер валідує повторно — клієнтська перевірка лише для UX
		const { valid, errors } = await validateSupport(values);
		if (!valid) {
			return fail(400, { errors, values, message: 'Заповнені не всі поля' });
		}

		try {
			await sendSupportMessage(values);
		} catch (err) {
			console.error('[support] Не вдалося надіслати повідомлення:', err);
			return fail(502, { values, message: 'Помилка відправки.' });
		}

		return { success: true };
	}
};
