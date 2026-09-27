<script lang="ts">
	import { resolve } from '$app/paths';
	import { i18n } from '$lib/i18n/state.svelte';

	interface Props {
		id: string;
		title: string;
		subtitle: string;
		/** note — коротка довідка праворуч (відстань); без неї — лише назва */
		cities: { name: string; path: string; note?: string }[];
		/** Слово перед назвою: «Погода Київ» — так люди шукають і так читається посилання */
		prefix?: string;
	}

	let { id, title, subtitle, cities, prefix }: Props = $props();
</script>

<!--
	Список посилань на інші населені пункти. Людям — швидкий перехід до сусіднього міста,
	пошуковим роботам — мережа посилань, якою вони доходять до кожної сторінки.
	Колонки заповнюються згори донизу, тож алфавітний список читається стовпчиками.
	Назва ніколи не обрізається трьома крапками. Вона — цілий блок: якщо не вміщується поруч
	зі словом «Погода», переходить на другий рядок повністю, а не рветься на «Івано-/Франківськ».
-->
{#if cities.length > 0}
	<section aria-labelledby={id} class="pb-12">
		<h2
			{id}
			class="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-[28px]"
		>
			{title} <span class="text-tertiary max-sm:block">{subtitle}</span>
		</h2>

		<ul class="mt-5 columns-2 gap-x-6 sm:columns-3 lg:columns-4">
			{#each cities as city (city.path)}
				<li class="break-inside-avoid border-b border-separator">
					<a
						href={i18n.href(resolve('/pohoda/[city]', { city: city.path }))}
						class="group flex items-baseline justify-between gap-3 py-3"
					>
						<span
							class="min-w-0 text-[15px] leading-[1.33] font-medium break-words group-hover:text-primary"
						>
							{#if prefix}
								<!-- «Погода» — сірим: око біжить по назвах, а не по однаковому слову -->
								<span class="font-normal text-tertiary group-hover:text-primary">{prefix}</span>
							{/if}
							<span class="inline-block max-w-full">{city.name}</span>
						</span>
						{#if city.note}
							<span class="shrink-0 text-[13px] text-tertiary tabular-nums">{city.note}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
