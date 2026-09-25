import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// Посилання від кореня (/pohoda/lviv), а не відносні (./pohoda/lviv): однакові на кожній сторінці
			paths: { relative: false }
		})
	],

	test: {
		// Мережу в тестах не чіпаємо: кожен тест, якому потрібен fetch, підміняє його сам
		restoreMocks: true,
		unstubGlobals: true,
		unstubEnvs: true,
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.{ts,svelte}', 'src/routes/**/*.ts'],
			exclude: ['src/lib/components/ui/**', 'src/**/*.d.ts']
		},
		projects: [
			{
				// Логіка, сервер і ендпоінти — у Node
				extends: true,
				test: {
					name: 'server',
					environment: 'node',
					include: ['tests/**/*.test.ts'],
					exclude: ['tests/**/*.svelte.test.ts']
				}
			},
			{
				// Компоненти — у jsdom з браузерною збіркою Svelte
				extends: true,
				plugins: [svelteTesting()],
				resolve: { conditions: ['browser'] },
				test: {
					name: 'client',
					environment: 'jsdom',
					// jsdom важкий: одне оточення на потік замість нового на кожен файл
					pool: 'vmThreads',
					include: ['tests/**/*.svelte.test.ts'],
					setupFiles: ['tests/setup/client.ts']
				}
			}
		]
	}
});
