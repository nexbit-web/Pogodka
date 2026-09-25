// $ npm run seed:cities
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

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

interface SeedCity {
	nameUa: string;
	nameRu: string;
	nameEn: string;
	region: string;
	countryUa: string;
	countryEn: string;
	latitude: number;
	longitude: number;
	slug: string;
}

async function main() {
	console.log('🌆 Починаємо завантаження міст України...');

	const filePath = path.join(process.cwd(), 'scripts', 'cities.json');
	const cities: SeedCity[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

	const result = await prisma.city.createMany({
		data: cities.map((city) => ({
			nameUa: city.nameUa,
			nameRu: city.nameRu,
			nameEn: city.nameEn,
			region: city.region,
			countryUa: city.countryUa,
			countryEn: city.countryEn,
			latitude: city.latitude,
			longitude: city.longitude,
			slug: city.slug
		})),
		skipDuplicates: true
	});

	console.log(`✅ Успішно завантажено ${result.count} міст!`);
}

main()
	.catch((e) => {
		console.error('❌ Помилка при завантаженні міст:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
