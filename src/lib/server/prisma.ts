import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

neonConfig.webSocketConstructor = ws;

const connectionString = env.DATABASE_URL;

if (!connectionString) {
	throw new Error('DATABASE_URL is not set');
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaNeon({ connectionString });

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// У dev зберігаємо клієнт між HMR-перезавантаженнями, щоб не плодити з'єднання
if (dev) {
	globalForPrisma.prisma = prisma;
}

export default prisma;
