<script module lang="ts">
	// На телефоні колонки підписів немає: підписи стоять малими заголовками над рядками
	const labelClass =
		'sticky left-0 z-10 bg-background py-2.5 pr-3 pl-3 text-left text-[13px] font-normal text-muted-foreground max-sm:p-0';
	const cellClass =
		'px-1 py-2.5 text-center tabular-nums max-sm:px-0 max-sm:pt-0 max-sm:pb-2.5 max-sm:text-[14px]';
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
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
		windDirectionText,
		dayAqi,
		dayPollen
	} from '$lib/weather';
	import { dayWarnings, daylight, describeDay, signed } from '$lib/dayInsights';
	import { typograph } from '$lib/typography';
	import { clock, dayOfMonth, isWeekend, kyivNow, monthName, weekdayName } from '$lib/date';
	import { VIEWS, viewDays, type ForecastView } from '$lib/forecastViews';
	import { i18n } from '$lib/i18n/state.svelte';
	import type { AirQualityData, OpenMeteoWeather } from '$lib/types';

	let {
		weather,
		now = kyivNow(),
		air = null,
		view = 'week',
		city = 'kyiv',
		home = false
	}: {
		weather: OpenMeteoWeather;
		/** Сторінка прогнозу: які дні показати і який обрати одразу */
		view?: ForecastView;
		/** Адреса населеного пункту для перемикача: /pohoda/{city}/zavtra */
		city?: string;
		/** Головна (Київ): «7 днів» веде на «/» */
		home?: boolean;
		/** Якість повітря й пилок; null — даних немає */
		air?: AirQualityData | null;
		/** Поточні дата й година в Києві — спільні з шапкою сторінки */
		now?: { date: string; hour: number };
	} = $props();

	const todayIso = $derived(now.date);
	// Дні до сьогодні (прогноз, отриманий до півночі) не показуємо
	const upcoming = $derived.by(() => {
		const all = buildForecastDays(weather);
		const ahead = all.filter((d) => d.date >= todayIso);
		return ahead.length > 0 ? ahead : all;
	});
	const picked = $derived(viewDays(upcoming, view));
	const days = $derived(picked.days);
	// Сторінка «на завтра» відкривається з обраним завтра — і на сервері теж, щоб його бачив пошуковик
	let selected = $state(untrack(() => picked.initial));
	const tomorrowIso = $derived(upcoming.find((d) => d.date > todayIso)?.date);

	// Перемикач сторінок прогнозу. Посилання, а не кнопки: у кожної сторінки своя адреса в пошуку
	const links = $derived(
		VIEWS.map((id) => ({
			id,
			label: i18n.t.views[id].label,
			href: i18n.href(
				id === 'week'
					? home
						? resolve('/')
						: resolve('/pohoda/[city]', { city })
					: resolve('/pohoda/[city]/[view=view]', { city, view: id })
			)
		}))
	);
	const heading = $derived(i18n.t.views[view].heading);
	const lang = $derived(i18n.lang);
	const t = $derived(i18n.t);
	// На десктопі картки завжди однакової ширини: 7 у ряд, для 10 днів — 10
	const tileColumns = $derived(view === '10-dniv' ? 10 : 7);

	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	const day = $derived(days[selected]);
	const isToday = $derived(day?.date === todayIso);

	// Таблиця як на Синоптику: кожні 3 години, колонка «Зараз» — поточна година
	const slots = $derived(day ? buildTableSlots(day.hours, isToday ? now.hour : undefined) : []);

	// Години до сходу й після заходу сонця — з нічними іконками
	const nightOf = (slot: (typeof slots)[number]) =>
		isNightHour(slot.time, day?.sunrise, day?.sunset);
	const currentIndex = $derived(slots.findIndex((s) => s.now));

	// Рядки, що нічого не кажуть про цей день, не показуємо: нулі й прочерки на весь день —
	// шум, а «відчувається як» без різниці з температурою — повтор (як і в шапці)
	const showFeelsRow = $derived(slots.some((s) => Math.round(s.feels) !== Math.round(s.temp)));
	const showProbRow = $derived(slots.some((s) => (s.precipProb ?? 0) > 0));
	const showPrecipRow = $derived(slots.some((s) => s.precip > 0));

	// Смуги через рядок і заокруглений низ колонки «зараз» — за тими рядками, що є насправді
	const rowKeys = $derived(
		[
			showFeelsRow && 'feels',
			'pressure',
			'humidity',
			'wind',
			showProbRow && 'prob',
			showPrecipRow && 'precip'
		].filter((key): key is string => Boolean(key))
	);
	const striped = (key: string) => rowKeys.indexOf(key) % 2 === 0;
	const isLast = (key: string) => rowKeys.at(-1) === key;

	// Небезпечна погода — окремими рядками над описом, лише коли вона справді очікується
	const warnings = $derived(day ? dayWarnings(day, isToday ? now.hour : 0, lang) : []);

	// Повітря: сьогодні — поточна година, інші дні — найгірша; пилок — лише помітний
	const aqi = $derived(
		air && day
			? dayAqi(
					air,
					day.date,
					isToday ? `${day.date}T${String(now.hour).padStart(2, '0')}:00` : undefined
				)
			: null
	);
	const pollen = $derived(air && day ? dayPollen(air, day.date) : null);

	const insights = $derived(
		day ? describeDay(day, isToday ? now.hour : 0, days[selected - 1], { aqi, pollen }, lang) : null
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
	<h2 id="forecast-title" class="sr-only">{heading}</h2>

	<!--
		Перемикач замість мітки «Прогноз на 7 днів»: той самий рядок, але тепер він ще й веде
		на «завтра», «10 днів», «вихідні». Поточна сторінка — кольором тексту, вага не змінюється,
		тож рядок не стрибає. Прокрутка сторінки при переході зберігається.
	-->
	<!--
		Без прокрутки: чотири короткі пункти вміщуються навіть на вузькому телефоні,
		а прокручуваний контейнер обрізав би збільшену зону натискання посилань.
		На зовсім вузькому екрані рядок переноситься, а не ховається за край.
	-->
	<nav aria-label={t.forecastPeriod}>
		<ul
			class="flex flex-wrap gap-x-5 gap-y-1 text-[15px] font-medium whitespace-nowrap max-[359px]:gap-x-3.5"
		>
			{#each links as link (link.id)}
				<li>
					<a
						href={link.href}
						data-sveltekit-noscroll
						aria-current={link.id === view ? 'page' : undefined}
						class="-my-2 block py-2 transition-colors {link.id === view
							? 'text-foreground'
							: 'text-tertiary hover:text-foreground'}"
					>
						{link.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!--
		Стрічка днів — як вибір конфігурації на apple.com: день тижня, число, іконка, макс./мін.
		Нічого, що не допомагає вибрати день: місяць є в заголовку панелі нижче,
		а вибір позначає лише колір рамки — текст при цьому не змінюється і не стрибає.
		Субота й неділя підписані червоним, як у календарі.
		Відступи по 6px навколо — щоб контур фокусу не обрізався прокруткою.
	-->
	<div
		role="tablist"
		aria-label={t.forecastDays}
		tabindex="-1"
		onkeydown={onTabsKeydown}
		class="day-tabs scroll-x -mx-4 mt-2 grid snap-x scroll-px-4 auto-cols-[4.75rem] grid-flow-col gap-2 px-4 py-1.5 sm:-mx-1.5 sm:gap-3 sm:px-1.5"
		style="--tile-columns: {tileColumns}; --tile-gap: {tileColumns > 7 ? '0.5rem' : '0.75rem'}"
	>
		{#each days as d, idx (d.date)}
			{@const active = idx === selected}
			<button
				id={`day-tab-${idx}`}
				role="tab"
				aria-selected={active}
				aria-controls="day-panel"
				tabindex={active ? 0 : -1}
				onclick={() => (selected = idx)}
				class="day-tab @container relative flex cursor-pointer snap-start flex-col items-center rounded-lg px-1 pt-3.5 pb-4 sm:pt-4 sm:pb-5"
				class:day-tab-active={active}
			>
				<span
					class="text-[13px] leading-none font-medium sm:text-[14px] {isWeekend(d.date)
						? 'text-weekend'
						: 'text-muted-foreground'}"
				>
					{#if d.date === todayIso}
						{t.today}
					{:else}
						<!--
							Повна назва — лише якщо вміщується в картку: картка сама знає свою ширину.
							Найдовші: «Понеділок» — 74 px, «Понедельник» — 95 px (ширина картки — без її відступів).
							Вужча картка (телефон, 10 днів, невеликий екран) — «Пн», як у календарі.
						-->
						<span class={lang === 'ru' ? '@min-[6rem]:hidden' : '@min-[4.75rem]:hidden'}
							>{cap(weekdayName(d.date, true, lang))}</span
						>
						<span
							class={lang === 'ru' ? 'hidden @min-[6rem]:inline' : 'hidden @min-[4.75rem]:inline'}
							>{cap(weekdayName(d.date, false, lang))}</span
						>
					{/if}
				</span>
				<span
					class="mt-2 text-[26px] leading-none font-semibold tracking-[-0.01em] tabular-nums sm:text-[30px]"
				>
					{dayOfMonth(d.date)}<span class="sr-only">&nbsp;{monthName(d.date, lang)}</span>
				</span>

				<svg
					class="my-3 size-7 sm:size-8"
					style="color: {getConditionTint(d.code)}"
					viewBox="0 0 24 24"
					role="img"
					aria-label={getWeatherText(d.code, lang)}
				>
					<use href={`/icons.svg?v=11#${getWeatherIconId(d.code)}`}></use>
				</svg>

				<!--
					Макс. і мін., як у «Погоді» на iPhone: вища — чорним, нижча — сірим.
					Поруч — лише якщо обидві вміщуються (~84 px), інакше одна під одною:
					телефон, 10 днів, невеликий екран
				-->
				<span
					class="flex flex-col items-center gap-0.5 text-[15px] leading-tight tabular-nums sm:text-[17px] @min-[5.25rem]:flex-row @min-[5.25rem]:gap-1.5"
				>
					<span class="font-semibold"><span class="sr-only">{t.max} </span>{signed(d.max)}</span>
					<span class="text-muted-foreground"
						><span class="sr-only">{t.min} </span>{signed(d.min)}</span
					>
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
				<!--
					Типографіка за шкалою apple.com: заголовок 19/24 px — на компʼютері вміщується в один рядок,
					на телефоні дата й характер дня стоять двома рівними рядками, а не рвуться посеред фрази.
					Текст 17 px з інтерліньяжем 1,47, рядок до ~70 знаків — око легко переходить на наступний.
					text-wrap: pretty не лишає одне слово в кінці абзацу.
					Нерозривні пробіли не дають відірвати «з» від «1:00» чи «0,9» від «мм».
				-->
				<h3
					class="text-[19px] leading-[1.26] font-semibold tracking-[-0.01em] text-pretty sm:text-[24px] sm:leading-[1.17]"
				>
					{isToday
						? t.today
						: day.date === tomorrowIso
							? t.tomorrow
							: cap(weekdayName(day.date, false, lang))},&nbsp;{dayOfMonth(
						day.date
					)}&nbsp;{monthName(day.date, lang)}.
					<span class="text-tertiary max-sm:block">{typograph(insights.title, lang)}.</span>
				</h3>
				{#if warnings.length > 0}
					<ul class="mt-4 flex flex-col gap-2">
						{#each warnings as warning (warning)}
							<li class="flex items-start gap-2 text-[17px] leading-[1.47] font-semibold">
								<TriangleAlert
									class="mt-[3px] size-[18px] shrink-0 text-warning"
									aria-hidden="true"
								/>
								{typograph(warning, lang)}
							</li>
						{/each}
					</ul>
				{/if}
				<p class="mt-3 max-w-[40rem] text-[17px] leading-[1.47] text-pretty">
					{typograph(insights.text, lang)}
				</p>

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
									<span class="sr-only">{t.metric}</span>
								</th>
								{#each t.dayParts as part, i (part)}
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
										{idx === currentIndex ? t.now : clock(slot.time, false)}
									</th>
								{/each}
							</tr>
						</thead>

						<tbody>
							<!-- Стан погоди -->
							<tr>
								<th scope="row" class="sticky left-0 z-10 bg-background">
									<span class="sr-only">{t.condition}</span>
								</th>
								{#each slots as slot, idx (slot.time)}
									<td class="px-1 pt-1 pb-2 text-center max-sm:px-0 {nowCell(idx)}">
										<svg
											class="mx-auto size-7 sm:size-8"
											style="color: {getConditionTint(slot.code, nightOf(slot))}"
											viewBox="0 0 24 24"
											role="img"
											aria-label={getWeatherText(slot.code, lang)}
										>
											<use href={`/icons.svg?v=11#${getWeatherIconId(slot.code, nightOf(slot))}`}
											></use>
										</svg>
									</td>
								{/each}
							</tr>

							<!-- Фішка: температура плавною кривою через увесь день -->
							{@render caption(t.temperature, false)}
							<tr>
								<th scope="row" class={labelClass}>
									<span class="max-sm:sr-only">{t.temperature}</span>
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

							{#if showFeelsRow}
								{@render row(
									t.feelsLike,
									(s) => signed(s.feels),
									striped('feels'),
									'text-muted-foreground'
								)}
							{/if}
							{@render row(t.pressure, (s) => String(hpaToMmHg(s.pressure)), striped('pressure'))}
							{@render row(t.humidity, (s) => String(Math.round(s.humidity)), striped('humidity'))}

							{@render caption(t.wind, striped('wind'))}
							<tr class={striped('wind') ? 'stripe' : ''}>
								<th scope="row" class={labelClass}>
									<span class="max-sm:sr-only">{t.wind}</span>
								</th>
								{#each slots as slot, idx (slot.time)}
									<td
										class="{cellClass} {nowCell(idx)} {isLast('wind') && idx === currentIndex
											? 'rounded-b-[10px]'
											: ''}"
									>
										<span
											class="inline-flex items-center gap-0.5 sm:gap-1"
											title={`${windDirectionText(slot.windDir, lang)}, ${t.gustsUpTo} ${Math.round(slot.gusts)} м/с`}
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

							{#if showProbRow}
								{@render row(
									t.precipProb,
									(s) => (s.precipProb === undefined ? '—' : String(s.precipProb)),
									striped('prob'),
									'',
									(s) => (s.precipProb ?? 0) >= 30,
									isLast('prob')
								)}
							{/if}

							{#if showPrecipRow}
								{@render row(
									t.precip,
									(s) => (s.precip > 0 ? s.precip.toFixed(1) : '—'),
									striped('precip'),
									'',
									(s) => s.precip > 0,
									true
								)}
							{/if}
						</tbody>
					</table>
				</div>

				<!--
					Сонце й ультрафіолет — мʼяка картка, як Trade In на apple.com.
					Лише підпис і значення: іконки повторювали б підписи, а кольорова шкала — слово «помірний».
					Час — без нуля попереду, як у таблиці вище: 6:48.
					Стоїть під таблицею: опис — зверху, години — посередині, сонце — наостанок.
					Повітря й пилок — в описі дня, окремих клітинок для них немає.
				-->
				{#if (day.sunrise && day.sunset) || day.uvMax !== undefined}
					<dl
						class="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-separator sm:grid-cols-4"
					>
						{#if day.sunrise && day.sunset}
							{@render stat(t.sunrise, clock(day.sunrise, false))}
							{@render stat(t.sunset, clock(day.sunset, false))}
							{@render stat(t.daylight, daylight(day.sunrise, day.sunset, lang))}
						{/if}
						{#if day.uvMax !== undefined}
							{@render stat(t.uvIndex, String(Math.round(day.uvMax)), uvText(day.uvMax, lang))}
						{/if}
					</dl>
				{/if}
			</div>
		{/key}
	{/if}
</section>

<!-- Показник у картці сонця: іконка й підпис сірим, значення крупно -->
{#snippet stat(label: string, value: string, note?: string)}
	<div class="bg-fill px-4 py-3.5 sm:px-5 sm:py-4">
		<dt class="text-[13px] text-muted-foreground">{label}</dt>
		<dd class="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
			<span class="text-[22px] leading-tight font-semibold tabular-nums">{value}</span>
			{#if note}
				<span class="text-[13px] text-muted-foreground">{note}</span>
			{/if}
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
		Картки днів — за зразком вибору конфігурації на apple.com:
		радіус 12px, тонка рамка кольору роздільника, на наведенні — темніша,
		у вибраного — така сама тонка, але кольору primary. Ні тіней, ні заливки.
		Рамка намальована тінню всередину і не займає місця у розмітці.
	*/
	/*
		Десктоп: ширина картки не залежить від їх кількості — 2 дні вихідних не розтягуються на весь ряд.
		Для 10 днів проміжки вужчі (8 px замість 12), щоб самим карткам лишилося більше місця
	*/
	@media (min-width: 640px) {
		.day-tabs {
			column-gap: var(--tile-gap);
			grid-auto-columns: calc(
				(100% - (var(--tile-columns) - 1) * var(--tile-gap)) / var(--tile-columns)
			);
		}
	}

	/*
		relative — обовʼязково: приховані підписи для скрінрідерів (місяць, «макс.», «мін.»)
		позиціюються абсолютно. Без цього вони чіплялися за блок поза стрічкою з прокруткою,
		і картки за правим краєм розтягували всю сторінку — зʼявлявся горизонтальний скрол.
	*/
	.day-tab {
		box-shadow: inset 0 0 0 1px var(--separator);
		transition: box-shadow 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}

	@media (hover: hover) {
		.day-tab:hover {
			box-shadow: inset 0 0 0 1px var(--text-tertiary);
		}
	}

	.day-tab-active,
	.day-tab-active:hover {
		box-shadow: inset 0 0 0 1px var(--primary);
	}

	/* Фокус із клавіатури — окремим контуром із відступом, як на apple.com */
	.day-tab:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 3px;
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
