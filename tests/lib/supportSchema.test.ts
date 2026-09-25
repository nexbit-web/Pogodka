import { describe, expect, it } from 'vitest';
import { validateSupport } from '$lib/supportSchema';

const valid = {
	email: 'user@example.com',
	subject: 'Помилка на сайті',
	message: 'Не відкривається сторінка Львова.'
};

describe('validateSupport', () => {
	it('пропускає коректне звернення', async () => {
		const result = await validateSupport(valid);
		expect(result).toEqual({ valid: true, errors: { email: '', subject: '', message: '' } });
	});

	it('збирає помилки одразу по всіх полях', async () => {
		const result = await validateSupport({
			email: 'not-an-email',
			subject: 'ab',
			message: 'коротко'
		});
		expect(result.valid).toBe(false);
		expect(result.errors).toEqual({
			email: 'Невірний email',
			subject: 'Мінімум 3 символи',
			message: 'Мінімум 10 символів'
		});
	});

	it('вимагає всі поля', async () => {
		const result = await validateSupport({ email: '', subject: '', message: '' });
		expect(result.errors.email).toBe('Email обовʼязковий');
		expect(result.errors.subject).toBe('Тема обовʼязкова');
		expect(result.errors.message).toBe('Повідомлення обовʼязкове');
	});

	it('обмежує довжину', async () => {
		const result = await validateSupport({
			...valid,
			subject: 'т'.repeat(101),
			message: 'п'.repeat(1001)
		});
		expect(result.errors.subject).toBe('Максимум 100 символів');
		expect(result.errors.message).toBe('Максимум 1000 символів');
	});

	it('межові значення довжини валідні', async () => {
		const result = await validateSupport({ ...valid, subject: 'абв', message: 'п'.repeat(1000) });
		expect(result.valid).toBe(true);
	});
});
