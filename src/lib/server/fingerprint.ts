import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

export function fingerprint(ip: string): string {
	if (!env.ANTI_BOT_SECRET) {
		throw new Error('ANTI_BOT_SECRET не заданий');
	}

	return crypto.createHmac('sha256', env.ANTI_BOT_SECRET).update(ip).digest('hex');
}
