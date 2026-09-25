<script lang="ts">
	import { resolve } from '$app/paths';
	import { APP_VERSION } from '$lib/version';

	interface Props {
		/** Останній елемент ланцюжка — назва сторінки або міста */
		breadcrumb?: string;
		/** Область міста — окремий крок ланцюжка перед назвою */
		region?: string;
	}

	let { breadcrumb, region }: Props = $props();
</script>

<footer class="mt-12 bg-footer sm:mt-20" itemscope itemtype="https://schema.org/WPFooter">
	<div class="mx-auto max-w-[980px] px-4 sm:px-6">
		<!-- Ланцюжок навігації: іконка проєкту → розділ → поточна сторінка -->
		<nav class="py-5" aria-label="Навігаційний ланцюжок">
			<ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]">
				<li class="flex items-center">
					<a
						href={resolve('/')}
						class="footer-mark flex transition-colors"
						aria-label="Pogodka — на головну"
					>
						<svg class="h-4 w-auto" viewBox="0 0 574 408" aria-hidden="true">
							<use href="/icons.svg?v=11#favicon"></use>
						</svg>
					</a>
				</li>

				<li aria-hidden="true" class="flex items-center">
					<svg
						class="h-2.5 w-2.5 text-tertiary"
						viewBox="0 0 10 10"
						fill="none"
						stroke="currentColor"
						stroke-width="1.2"
					>
						<path d="M3.5 1.5 6.5 5l-3 3.5" />
					</svg>
				</li>

				<li>
					<a
						href={resolve('/')}
						class="text-muted-foreground transition-colors hover:text-foreground hover:underline"
					>
						Прогноз погоди
					</a>
				</li>

				<!-- Область → місто: від загального до конкретного, як у ланцюжках Apple -->
				<!-- Для Києва область і місто збігаються — показуємо один раз -->
				{#each [...new Set([region, breadcrumb].filter(Boolean))] as crumb, idx (idx)}
					<li aria-hidden="true" class="flex items-center">
						<svg
							class="h-2.5 w-2.5 text-tertiary"
							viewBox="0 0 10 10"
							fill="none"
							stroke="currentColor"
							stroke-width="1.2"
						>
							<path d="M3.5 1.5 6.5 5l-3 3.5" />
						</svg>
					</li>
					<li
						class="text-muted-foreground"
						aria-current={crumb === breadcrumb ? 'page' : undefined}
					>
						{crumb}
					</li>
				{/each}
			</ol>
		</nav>

		<!-- Полоса між ланцюжком і правовим блоком -->
		<div class="border-t border-separator"></div>

		<div class="py-5">
			<!-- Соцмережі -->
			<p class="text-[0.75rem] text-muted-foreground">
				Стежте за нами:
				<a
					href="https://www.youtube.com/@Pogodka-UA"
					target="_blank"
					rel="noopener noreferrer me"
					class="text-primary hover:underline"
					itemprop="sameAs">YouTube</a
				>. Дані прогнозу:
				<!-- Ліцензія CC BY 4.0 вимагає вказувати джерело -->
				<a
					href="https://open-meteo.com/"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary hover:underline">Open-Meteo.com</a
				>.
			</p>

			<!-- Правовий рядок -->
			<div
				class="mt-2 flex flex-col gap-y-2 text-[0.75rem] text-muted-foreground sm:flex-row sm:items-center sm:gap-x-8"
			>
				<p class="m-0">
					Copyright © {new Date().getFullYear()}
					<span itemprop="name">Pogodka.org</span>. Усі права захищено.
				</p>

				<nav
					class="flex flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap sm:gap-x-3"
					aria-label="Правова інформація"
				>
					<a
						href={resolve('/about')}
						class="transition-colors hover:text-foreground hover:underline"
					>
						Про нас
					</a>
					<span class="text-separator max-sm:hidden" aria-hidden="true">|</span>
					<a
						href={resolve('/privacypolicy')}
						class="transition-colors hover:text-foreground hover:underline"
					>
						Політика конфіденційності
					</a>
					<span class="text-separator max-sm:hidden" aria-hidden="true">|</span>
					<a
						href={resolve('/agreement')}
						class="transition-colors hover:text-foreground hover:underline"
					>
						Умови використання
					</a>
					<span class="text-separator max-sm:hidden" aria-hidden="true">|</span>
					<a
						href={resolve('/support')}
						class="transition-colors hover:text-foreground hover:underline"
					>
						Техпідтримка
					</a>
				</nav>

				<p class="m-0 flex items-center gap-1.5 sm:ml-auto">
					<span class="text-tertiary">v{APP_VERSION}</span>
					<span class="text-separator" aria-hidden="true">|</span>
					<span>Україна</span>
				</p>
			</div>
		</div>
	</div>
</footer>

<style>
	/*
		Іконка трохи темніша за сірий текст поруч, але не чорна.
		На ховер доходить до того ж кольору, що й решта посилань.
	*/
	.footer-mark {
		color: color-mix(in oklab, var(--muted-foreground) 62%, var(--foreground));
	}

	.footer-mark:hover {
		color: var(--foreground);
	}
</style>
