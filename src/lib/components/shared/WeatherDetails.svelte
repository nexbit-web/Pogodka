<script lang="ts">
	import Wind from '@lucide/svelte/icons/wind';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Droplets from '@lucide/svelte/icons/droplets';
	import Eye from '@lucide/svelte/icons/eye';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Navigation from '@lucide/svelte/icons/navigation';
	import SectionHeading from './SectionHeading.svelte';
	import DetailItem from './DetailItem.svelte';
	import type { CurrentWeather } from '$lib/types';

	let { current }: { current: CurrentWeather } = $props();

	function degToCompass(deg: number) {
		const directions = ['Пн', 'ПнСх', 'Сх', 'ПдСх', 'Пд', 'ПдЗх', 'Зх', 'ПнЗх'];
		return directions[Math.round(deg / 45) % 8];
	}

	function precipitationText(mm: number): string {
		if (mm === 0) return 'Без опадів';
		if (mm < 1) return 'Невеликі опади';
		if (mm < 3) return 'Легкий дощ';
		if (mm < 10) return 'Помірний дощ';
		return 'Сильні опади';
	}

	function visibilityText(km: number): string {
		if (km >= 10) return 'Добра видимість';
		if (km >= 5) return 'Середня видимість';
		return 'Погана видимість';
	}

	function pressureText(hpa: number): string {
		if (hpa < 1000) return 'Низький тиск';
		if (hpa < 1015) return 'У межах норми';
		if (hpa < 1025) return 'Високий тиск';
		return 'Дуже високий тиск';
	}

	const precipitation = $derived(Number(current.precipitation.toFixed(1)));
</script>

<section aria-labelledby="details-title">
	<SectionHeading id="details-title" icon={Gauge} title="Детальніше" />

	<!--
		Показники розділяються волосяними лініями, а не рамками:
		структура читається, але жодних «коробок».
	-->
	<div
		class="mt-1 grid grid-cols-1 divide-y divide-separator border-separator sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3"
	>
		<DetailItem
			icon={Wind}
			label="Вітер"
			value={String(Math.round(current.wind))}
			unit="м/с"
			caption={`Пориви до ${Math.round(current.gusts)} м/с · ${degToCompass(current.windDir)}`}
		>
			{#snippet adornment()}
				<!-- Стрілка показує напрямок, звідки дме вітер -->
				<Navigation
					size={18}
					class="shrink-0 text-muted-foreground"
					style={`transform: rotate(${current.windDir + 180}deg)`}
					aria-label={`Напрямок вітру ${Math.round(current.windDir)} градусів`}
				/>
			{/snippet}
		</DetailItem>

		<DetailItem
			icon={Droplet}
			label="Вологість"
			value={String(Math.round(current.humidity))}
			unit="%"
			caption={`Точка роси ${Math.round(current.dewPoint)}°`}
		/>

		<DetailItem
			icon={Droplets}
			label="Опади"
			value={String(precipitation)}
			unit="мм"
			caption={precipitationText(precipitation)}
		/>

		<DetailItem
			icon={Eye}
			label="Видимість"
			value={String(Math.round(current.visibility))}
			unit="км"
			caption={visibilityText(current.visibility)}
		/>

		<DetailItem
			icon={Gauge}
			label="Тиск"
			value={String(Math.round(current.pressure))}
			unit="гПа"
			caption={pressureText(current.pressure)}
		/>
	</div>
</section>
