import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
	adapter: new PrismaNeon({ connectionString })
});

async function main() {
	console.log('Завантаження міст із бази даних...');

	const cities = await prisma.city.findMany({
		orderBy: { nameEn: 'asc' }
	});

	const outputPath = path.join(process.cwd(), 'scripts', 'cities-from-db.json');

	fs.writeFileSync(outputPath, JSON.stringify(cities, null, 2), 'utf-8');

	console.log(`Експортовано міст: ${cities.length}`);
	console.log(`Файл: ${outputPath}`);
}

main()
	.catch((error: unknown) => {
		console.error('Помилка експорту міст:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
