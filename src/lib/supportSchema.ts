import * as Yup from 'yup';

// Спільна валідація форми підтримки: використовується і на клієнті, і на сервері
export const supportSchema = Yup.object({
	email: Yup.string().email('Невірний email').required('Email обовʼязковий'),
	subject: Yup.string()
		.min(3, 'Мінімум 3 символи')
		.max(100, 'Максимум 100 символів')
		.required('Тема обовʼязкова'),
	message: Yup.string()
		.min(10, 'Мінімум 10 символів')
		.max(1000, 'Максимум 1000 символів')
		.required('Повідомлення обовʼязкове')
});

export type SupportErrors = { email: string; subject: string; message: string };

export const emptyErrors: SupportErrors = { email: '', subject: '', message: '' };

/** Повертає помилки по полях; порожні рядки означають, що поле валідне. */
export async function validateSupport(values: {
	email: string;
	subject: string;
	message: string;
}): Promise<{ valid: boolean; errors: SupportErrors }> {
	try {
		await supportSchema.validate(values, { abortEarly: false });
		return { valid: true, errors: { ...emptyErrors } };
	} catch (err) {
		const errors: SupportErrors = { ...emptyErrors };

		if (err instanceof Yup.ValidationError) {
			for (const inner of err.inner) {
				if (inner.path && inner.path in errors) {
					errors[inner.path as keyof SupportErrors] = inner.message;
				}
			}
		}

		return { valid: false, errors };
	}
}
