import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Стара адреса індексу: robots.txt закриває /api/, тож карта переїхала на /sitemap.xml
export const GET: RequestHandler = () => redirect(301, '/sitemap.xml');
