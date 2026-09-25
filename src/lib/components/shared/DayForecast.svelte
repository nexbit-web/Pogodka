<script module lang="ts">
	// На телефоні колонки підписів немає: підписи стоять малими заголовками над рядками
	const labelClass =
		'sticky left-0 z-10 bg-background py-2.5 pr-3 pl-3 text-left text-[13px] font-normal text-muted-foreground max-sm:p-0';
	const cellClass =
		'px-1 py-2.5 text-center tabular-nums max-sm:px-0 max-sm:pt-0 max-sm:pb-2.5 max-sm:text-[14px]';

	// Частини доби, як на Синоптику: по дві тригодинні колонки
	const DAY_PARTS = ['ніч', 'ранок', 'день', 'вечір'];

	// Шкала УФ-індексу, як у «Погоді» на iPhone: від безпечного зеленого до фіолетового
	const UV_GRADIENT =
		'linear-gradient(90deg, #34c759, #ffcc00 30%, #ff9500 55%, #ff3b30 75%, #af52de)';
</script>

<script lang="ts">
	import { fade } from 'svelte/transition';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Sunrise from '@lucide/svelte/icons/sunrise';
	import Sunset from '@lucide/svelte/icons/sunset';
	import Hourglass from '@lucide/svelte/icons/hourglass';
	import Sun from '@lucide/svelte/icons/sun';
	import TempCurve from './TempCurve.svelte';
	import {
		buildForecastDays,
		buildTableSlots,
		getConditionTint,
		getWeatherIconId,
		isNightHour,
		getWeatherText,
		hpaToMmHg,
		uvText,
		windDirectionText
	} from '$lib/weather';
	import { daylight, describeDay, signed } from '$lib/dayInsights';
	import { clock, dayOfMonth, isWeekend, kyivNow, monthName, weekdayName } from '$lib/date';
	import type { OpenMeteoWeather } from '$lib/types';

	let {
		weather,
		city = '',
		now = kyivNow()
	}: {
		weather: OpenMeteoWeather;
		city?: string;
		/** Поточні дата й година в Києві — спільні з шапкою сторінки */
		now?: { date: string; hour: number };
	} = $props();

	const todayIso = $derived(now.date);
	// Дні до сьогодні (прогноз, отриманий до півночі) не показуємо
	const days = $derived.by(() => {
		const all = buildForecastDays(weather);
		const upcoming = all.filter((d) => d.date >= todayIso);
		return upcoming.length > 0 ? upcoming : all;
	});
	let selected = $state(0);

	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	const day = $derived(days[selected]);
	const isToday = $derived(day?.date === todayIso);
	const weekend = $derived(day ? isWeekend(day.date) : false);

	// Таблиця як на Синоптику: кожні 3 години, колонка «Зараз» — поточна година
	const slots = $derived(day ? buildTableSlots(day.hours, isToday ? now.hour : undefined) : []);

	// Години до сходу й після заходу сонця — з нічними іконками
	const nightOf = (slot: (typeof slots)[number]) =>
		isNightHour(slot.time, day?.sunrise, day?.sunset);
	const currentIndex = $derived(slots.findIndex((s) => s.now));
	const hasProbability = $derived(slots.some((s) => s.precipProb !== undefined));

	const insights = $derived(
		day ? describeDay(day, isToday ? now.hour : 0, days[selected - 1]) : null
	);

	// Колонка «зараз» підсвічена ледь помітним primary, як виділення у Finder
	const nowCell = (idx: number) => (idx === currentIndex ? 'now' : '');
	// Розділювачі частин доби — лише в шапці таблиці, тіло лишається чистим
	const groupStart = (idx: number) => idx > 0 && idx % 2 === 0;

	function onTabsKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowRight') selected = Math.min(selected + 1, days.length - 1);
		else if (event.key === 'ArrowLeft') selected = Math.max(selected - 1, 0);
		else return;
		event.preventDefault();
		document.getElementById(`day-tab-${selected}`)?.focus();
	}
</script>

<section aria-labelledby="forecast-title">
	<!-- Двотонний заголовок, як на apple.com: твердження чорним, пояснення сірим -->
	<h2
		id="forecast-title"
		class="text-[24px] leading-tight font-semibold tracking-[-0.02em] sm:text-[28px]"
	>
		{city ? `Погода ${city} на 7 днів.` : 'Прогноз на 7 днів.'}
		<span class="text-tertiary">Оберіть день.</span>
	</h2>

	<!-- Стрічка днів: день тижня, число, місяць, іконка, мін/макс -->
	<div
		role="tablist"
		aria-label="Дні прогнозу"
		tabindex="-1"
		onkeydown={onTabsKeydown}
		class="scroll-x -mx-4 mt-5 grid scroll-px-4 auto-cols-[4.75rem] grid-flow-col gap-2 px-4 sm:mx-0 sm:auto-cols-[minmax(6.5rem,1fr)] sm:px-0"
	>
		{#each days as d, idx (d.date)}
			{@const active = idx === selected}
			{@const red = isWeekend(d.date)}
			<button
				id={`day-tab-${idx}`}
				role="tab"
				aria-selected={active}
				aria-controls="day-panel"
				tabindex={active ? 0 : -1}
				onclick={() => (selected = idx)}
				class="day-tab flex cursor-pointer flex-col items-center rounded-2xl px-1 pt-3 pb-3.5 sm:px-2"
				class:day-tab-active={active}
			>
				<span
					class="text-[13px] {active ? 'font-semibold' : 'font-medium'} {red ? 'text-weekend' : ''}"
				>
					{#if d.date === todayIso}
						Сьогодні
					{:else}
						<span class="sm:hidden">{cap(weekdayName(d.date, true))}</span>
						<span class="max-sm:hidden">{cap(weekdayName(d.date))}</span>
					{/if}
				</span>
				<span
					class="mt-0.5 text-[24px] leading-tight font-semibold tabular-nums sm:text-[28px] {red
						? 'text-weekend'
						: ''}"
				>
					{dayOfMonth(d.date)}
				</span>
				<span class="text-[12px] text-tertiary">{monthName(d.date)}</span>

				<svg
					class="my-2 size-8 sm:size-9"
					style="color: {getConditionTint(d.code)}"
					viewBox="0 0 24 24"
					role="img"
					aria-label={getWeatherText(d.code)}
				>
					<use href={`/icons.svg?v=11#${getWeatherIconId(d.code)}`}></use>
				</svg>

				<!-- Телефон: макс. над мін., без підписів — так вужче -->
				<span class="flex flex-col items-center leading-tight tabular-nums sm:hidden">
					<span class="text-[15px] font-semibold">{signed(d.max)}</span>
					<span class="text-[13px] text-muted-foreground">{signed(d.min)}</span>
				</span>
				<span class="grid grid-cols-2 gap-x-3 text-center max-sm:hidden">
					<span class="text-[10px] text-tertiary">мін.</span>
					<span class="text-[10px] text-tertiary">макс.</span>
					<span class="text-[15px] text-muted-foreground tabular-nums">{signed(d.min)}</span>
					<span class="text-[15px] font-semibold tabular-nums">{signed(d.max)}</span>
				</span>
			</button>
		{/each}
	</div>

	<!-- Панель вибраного дня -->
	{#if day && insights}
		{#key day.date}
			<div
				id="day-panel"
				role="tabpanel"
				aria-labelledby={`day-tab-${selected}`}
				class="mt-9 sm:mt-12"
				in:fade={{ duration: 180 }}
			>
				<!-- «Пʼятниця, 25 вересня. Свіжий день зі змінною хмарністю.» -->
				<h3
					class="max-w-[46rem] text-[22px] leading-[1.2] font-semibold tracking-[-0.02em] sm:text-[26px]"
				>
					<span class={weekend ? 'text-weekend' : ''}>
						{isToday ? 'Сьогодні' : cap(weekdayName(day.date))}</span
					>, {dayOfMonth(day.date)}
					{monthName(day.date)}. <span class="text-tertiary">{insights.title}.</span>
				</h3>
				<p class="mt-3 max-w-[46rem] text-[17px] leading-relaxed">{insights.text}</p>

				<!-- Сонце й ультрафіолет — мʼяка картка, як Trade In на apple.com -->
				{#if (day.sunrise && day.sunset) || day.uvMax !== undefined}
					<dl
						class="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-separator sm:grid-cols-4"
					>
						{#if day.sunrise && day.sunset}
							{@render stat(Sunrise, 'Схід сонця', clock(day.sunrise), 'var(--w-sun)')}
							{@render stat(Sunset, 'Захід сонця', clock(day.sunset), 'var(--w-sun)')}
							{@render stat(Hourglass, 'Світловий день', daylight(day.sunrise, day.sunset))}
						{/if}
						{#if day.uvMax !== undefined}
							<div class="bg-fill px-4 py-3.5 sm:px-5 sm:py-4">
								<dt class="flex items-center gap-1.5 text-[13px] text-muted-foreground">
									<Sun class="size-4" style="color: var(--w-sun)" aria-hidden="true" />
									УФ-індекс
								</dt>
								<dd class="mt-1 flex items-baseline gap-1.5">
									<span class="text-[22px] leading-tight font-semibold tabular-nums">
										{Math.round(day.uvMax)}
									</span>
									<span class="text-[13px] text-muted-foreground">{uvText(day.uvMax)}</span>
								</dd>
								<!-- Шкала з позначкою рівня -->
								<div
									class="relative mt-2.5 h-1 rounded-full"
									style="background: {UV_GRADIENT}"
									aria-hidden="true"
								>
									<span
										class="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fill bg-foreground"
										style="left: {Math.min(Math.max(day.uvMax / 11, 0), 1) * 100}%"
									></span>
								</div>
							</div>
						{/if}
					</dl>
				{/if}

				<!-- Погодинна таблиця в стилі Finder: смуги замість ліній -->
				<div class="scroll-x -mx-4 mt-8 px-4 sm:mx-0 sm:px-0">
					<table
						class="day-table w-full min-w-[19rem] table-fixed border-separate border-spacing-0 text-[15px] sm:min-w-[40rem]"
					>
						<colgroup>
							<col class="w-[11rem] max-sm:w-0" />
							{#each slots as slot (slot.time)}
								<col />
							{/each}
						</colgroup>

						<thead>
							<!-- Частини доби -->
							<tr>
								<th class="sticky left-0 z-10 bg-background" scope="col">
									<span class="sr-only">Показник</span>
								</th>
								{#each DAY_PARTS as part, i (part)}
									<th
										colspan="2"
										scope="colgroup"
										class="pb-1 text-center text-[12px] font-medium text-tertiary {i > 0
											? 'border-l border-separator'
											: ''}"
									>
										{part}
									</th>
								{/each}
							</tr>

							<!-- Години -->
							<tr>
								<th class="sticky left-0 z-10 bg-background" scope="col"></th>
								{#each slots as slot, idx (slot.time)}
									<th
										scope="col"
										class="px-1 pt-2 pb-1 text-center text-[12px] font-normal tabular-nums max-sm:px-0 {idx ===
										currentIndex
											? 'now rounded-t-[10px] font-semibold text-primary'
											: 'text-tertiary'} {groupStart(idx) ? 'border-l border-separator' : ''}"
									>
										{idx === currentIndex ? 'Зараз' : clock(slot.time, false)}
									</th>
								{/each}
							</tr>
						</thead>

						<tbody>
							<!-- Стан погоди -->
							<tr>
								<th scope="row" class="sticky left-0 z-10 bg-background">
									<span class="sr-only">Стан погоди</span>
								</th>
								{#each slots as slot, idx (slot.time)}
									<td class="px-1 pt-1 pb-2 text-center max-sm:px-0 {nowCell(idx)}">
										<svg
											class="mx-auto size-7 sm:size-8"
											style="color: {getConditionTint(slot.code, nightOf(slot))}"
											viewBox="0 0 24 24"
											role="img"
											aria-label={getWeatherText(slot.code)}
										>
											<use href={`/icons.svg?v=11#${getWeatherIconId(slot.code, nightOf(slot))}`}
											></use>
										</svg>
									</td>
								{/each}
							</tr>

							<!-- Фішка: температура плавною кривою через увесь день -->
							{@render caption('Температура', false)}
							<tr>
								<th scope="row" class={labelClass}>
									<span class="max-sm:sr-only">Температура</span>
								</th>
								{#each slots as slot, idx (slot.time)}
									<td class="relative h-[5.5rem] p-0 {nowCell(idx)}">
										<!-- Крива лежить поверх клітинок і тягнеться на всю ширину рядка -->
										{#if idx === 0}
											<div
												class="absolute inset-y-0 left-0 z-[1]"
												style="width: {slots.length * 100}%"
											>
												<TempCurve temps={slots.map((s) => s.temp)} />
											</div>
										{/if}
									</td>
								{/each}
							</tr>

							{@render row(
								'Відчувається як',
								(s) => signed(s.feels),
								true,
								'text-muted-foreground'
							)}
							{@render row('Тиск, мм', (s) => String(hpaToMmHg(s.pressure)), false)}
							{@render row('Вологість, %', (s) => String(Math.round(s.humidity)), true)}

							{@render caption('Вітер, м/с', false)}
							<tr>
								<th scope="row" class={labelClass}>
									<span class="max-sm:sr-only">Вітер, м/с</span>
								</th>
								{#each slots as slot, idx (slot.time)}
									<td class="{cellClass} {nowCell(idx)}">
										<span
											class="inline-flex items-center gap-0.5 sm:gap-1"
											title={`${windDirectionText(slot.windDir)}, пориви до ${Math.round(slot.gusts)} м/с`}
										>
											<!-- Стрілка показує, куди дме вітер -->
											<ArrowUp
												size={13}
												class="size-[11px] text-muted-foreground sm:size-[13px]"
												style={`transform: rotate(${slot.windDir + 180}deg)`}
												aria-hidden="true"
											/>
											{slot.wind.toFixed(1)}
										</span>
									</td>
								{/each}
							</tr>

							{#if hasProbability}
								{@render row(
									'Ймовірність опадів, %',
									(s) => (s.precipProb === undefined ? '—' : String(s.precipProb)),
									true,
									'',
									(s) => (s.precipProb ?? 0) >= 30
								)}
							{/if}

							{@render row(
								'Опади, мм',
								(s) => (s.precip > 0 ? s.precip.toFixed(1) : '—'),
								!hasProbability,
								'',
								(s) => s.precip > 0,
								true
							)}
						</tbody>
					</table>
				</div>
			</div>
		{/key}
	{/if}
</section>

<!-- Показник у картці сонця: іконка й підпис сірим, значення крупно -->
{#snippet stat(Icon: typeof Sun, label: string, value: string, tint?: string)}
	<div class="bg-fill px-4 py-3.5 sm:px-5 sm:py-4">
		<dt class="flex items-center gap-1.5 text-[13px] text-muted-foreground">
			<Icon
				class="size-4 {tint ? '' : 'text-tertiary'}"
				style={tint ? `color: ${tint}` : undefined}
				aria-hidden="true"
			/>
			{label}
		</dt>
		<dd class="mt-1 text-[22px] leading-tight font-semibold whitespace-nowrap tabular-nums">
			{value}
		</dd>
	</div>
{/snippet}

<!-- Рядок показника. striped — смуга фону, як через рядок у Finder -->
{#snippet row(
	label: string,
	value: (s: (typeof slots)[number]) => string,
	striped: boolean,
	extra: string = '',
	wet: (s: (typeof slots)[number]) => boolean = () => false,
	last: boolean = false
)}
	{@render caption(label, striped)}
	<tr class={striped ? 'stripe' : ''}>
		<th scope="row" class={labelClass}><span class="max-sm:sr-only">{label}</span></th>
		{#each slots as slot, idx (slot.time)}
			<td
				class="{cellClass} {extra} {nowCell(idx)} {wet(slot) ? 'text-primary' : ''} {last &&
				idx === currentIndex
					? 'rounded-b-[10px]'
					: ''}"
			>
				{value(slot)}
			</td>
		{/each}
	</tr>
{/snippet}

<!--
	Підпис над рядком — лише на телефоні. Клітинки ті самі, що й у рядку,
	тож смуга фону й підсвітка «зараз» ідуть суцільно.
-->
{#snippet caption(label: string, striped: boolean)}
	<tr class="sm:hidden {striped ? 'stripe-caption' : ''}" aria-hidden="true">
		<td class="p-0"></td>
		{#each slots as slot, idx (slot.time)}
			<td class="relative h-7 p-0 {nowCell(idx)}">
				{#if idx === 0}
					<span class="absolute top-2 left-2 z-[2] text-[12px] whitespace-nowrap text-tertiary">
						{label}
					</span>
				{/if}
			</td>
		{/each}
	</tr>
{/snippet}

<style>
	/*
		Картки днів як вибір моделі на apple.com: тонка сіра рамка,
		у вибраного — рамка кольору primary. Рамка намальована тінню всередину,
		тож товщина змінюється без зсуву вмісту.
	*/
	.day-tab {
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--text-tertiary) 55%, var(--background));
		transition: box-shadow 0.15s ease;
	}

	.day-tab:hover {
		box-shadow: inset 0 0 0 1px var(--text-tertiary);
	}

	.day-tab-active,
	.day-tab-active:hover {
		box-shadow: inset 0 0 0 2px var(--primary);
	}

	/* Таблиця: смуги через рядок і мʼяко підсвічена колонка «зараз» */
	.day-table :global(.now) {
		background: color-mix(in oklab, var(--primary) 7%, var(--background));
	}

	.day-table :global(tr.stripe > *),
	.day-table :global(tr.stripe-caption > *) {
		background: var(--fill);
	}

	.day-table :global(tr.stripe > .now),
	.day-table :global(tr.stripe-caption > .now) {
		background: color-mix(in oklab, var(--primary) 9%, var(--fill));
	}

	.day-table :global(tr.stripe > :first-child) {
		border-top-left-radius: 10px;
		border-bottom-left-radius: 10px;
	}

	.day-table :global(tr.stripe > :last-child) {
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
	}

	/* Телефон: смуга охоплює підпис і значення як одне ціле */
	@media (max-width: 639px) {
		.day-table :global(tr.stripe > :first-child),
		.day-table :global(tr.stripe > :last-child) {
			border-top-left-radius: 0;
			border-top-right-radius: 0;
		}

		.day-table :global(tr.stripe > :nth-child(2)) {
			border-bottom-left-radius: 10px;
		}

		.day-table :global(tr.stripe-caption > :nth-child(2)) {
			border-top-left-radius: 10px;
		}

		.day-table :global(tr.stripe-caption > :last-child) {
			border-top-right-radius: 10px;
		}
	}
</style>
