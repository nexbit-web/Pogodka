import prisma from '../lib/prisma'; 
// $ npm run seed:cities
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🌆 Начинаем загрузку городов Украины...');

  const filePath = path.join(process.cwd(), 'scripts', 'cities.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const cities = JSON.parse(rawData);

  const result = await prisma.city.createMany({
    data: cities.map((city: any) => ({
      nameUa: city.nameUa,
      nameRu: city.nameRu,
      nameEn: city.nameEn,
      region: city.region,
      countryUa: city.countryUa,
      countryEn: city.countryEn,
      latitude: city.latitude,
      longitude: city.longitude,
    })),
    skipDuplicates: true,
  });

  console.log(`✅ Успешно загружено ${result.count} городов!`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при загрузке городов:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });