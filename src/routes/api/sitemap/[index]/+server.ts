import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Старі адреси файлів карти сайту ведуть на новий індекс
export const GET: RequestHandler = () => redirect(301, '/sitemap.xml');
