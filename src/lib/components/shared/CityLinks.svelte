<script lang="ts">
	import { resolve } from '$app/paths';

	interface Props {
		id: string;
		title: string;
		subtitle: string;
		cities: { name: string; path: string; note: string }[];
	}

	let { id, title, subtitle, cities }: Props = $props();
</script>

<!--
	Список посилань на інші населені пункти. Людям — швидкий перехід до сусіднього міста,
	пошуковим роботам — мережа посилань, якою вони доходять до кожної сторінки.
-->
{#if cities.length > 0}
	<section aria-labelledby={id} class="pb-12">
		<h2 {id} class="text-[24px] leading-tight font-semibold tracking-[-0.02em] sm:text-[28px]">
			{title} <span class="text-tertiary">{subtitle}</span>
		</h2>

		<ul class="mt-5 grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4">
			{#each cities as city (city.path)}
				<li class="border-b border-separator">
					<a
						href={resolve('/pohoda/[city]', { city: city.path })}
						class="group flex items-baseline justify-between gap-2 py-3"
					>
						<span class="truncate text-[15px] font-medium group-hover:text-primary">
							{city.name}
						</span>
						<span class="shrink-0 text-[13px] text-tertiary tabular-nums">{city.note}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
