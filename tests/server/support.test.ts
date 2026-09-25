import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock('$env/dynamic/private', () => ({ env }));

const { sendSupportMessage } = await import('$lib/server/support');
const { fingerprint } = await import('$lib/server/fingerprint');

const fetchMock = vi.fn();
const message = { email: 'a@b.ua', subject: 'Тема', message: 'Текст звернення' };

beforeEach(() => {
	env.TG_BOT_TOKEN = 'bot-token';
	env.TG_SUPPORT_CHAT_ID = '-100500';
	env.ANTI_BOT_SECRET = 'anti-bot';
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

describe('sendSupportMessage', () => {
	it('надсилає звернення в Telegram-чат підтримки', async () => {
		fetchMock.mockResolvedValue(new Response('{"ok":true}'));

		await sendSupportMessage(message);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://api.telegram.org/botbot-token/sendMessage');
		expect(init.method).toBe('POST');
		const body = JSON.parse(init.body);
		expect(body.chat_id).toBe('-100500');
		expect(body.text).toContain('a@b.ua');
		expect(body.text).toContain('Тема');
		expect(body.text).toContain('Текст звернення');
	});

	it('без токенів — зрозуміла помилка і жодних запитів', async () => {
		env.TG_BOT_TOKEN = undefined;
		await expect(sendSupportMessage(message)).rejects.toThrow(/TG_BOT_TOKEN/);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('помилка Telegram API піднімається нагору з кодом', async () => {
		fetchMock.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
		await expect(sendSupportMessage(message)).rejects.toThrow('401');
	});
});

describe('fingerprint', () => {
	it('стабільний HMAC для однієї IP і різний для різних', () => {
		const a = fingerprint('1.2.3.4');
		expect(a).toMatch(/^[0-9a-f]{64}$/);
		expect(fingerprint('1.2.3.4')).toBe(a);
		expect(fingerprint('1.2.3.5')).not.toBe(a);
	});

	it('без секрету відмовляється працювати', () => {
		env.ANTI_BOT_SECRET = undefined;
		expect(() => fingerprint('1.2.3.4')).toThrow(/ANTI_BOT_SECRET/);
	});
});
