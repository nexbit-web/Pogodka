<script lang="ts">
	import { getWeatherText } from '$lib/weather';

	interface Props {
		city: string;
		temperature: number;
		weather: number;
		isFelt: number;
	}

	let { city, temperature, weather, isFelt }: Props = $props();

	/*
		Як це працює (за зразком «Погоди» на iPhone):
		- Шапка — фіксований шар. Спершу він їде вгору разом із навігацією сайту,
		  а щойно навігація сховалась — прилипає до верху екрана.
		- Назва міста після цього не рухається, а температура й рядки під нею
		  їдуть угору разом зі сторінкою і плавно заходять під місто.
		- Нижній край шару весь час притиснутий до контенту: поки шапка згортається,
		  між нею і контентом немає ні дірки, ні накладання.
		- У потоці сторінки стоїть розпірка сталої висоти. Жоден елемент не змінює висоту
		  під час прокрутки, тому браузерний scroll anchoring не смикає сторінку.
		  Щокадрово змінюються лише clip-path, mask, transform і opacity.
	*/

	// Геометрія шару, px від його верхнього краю
	const H_EXPANDED = 204; // повна висота розгорнутої шапки
	const H_COLLAPSED = 91; // місто + рядок + повітря до контенту
	const CITY_BOTTOM = 48; // низ назви міста
	const LINE_BOTTOM = 84; // низ рядка «18° | Похмуро»
	// Мʼякий край під згорнутою шапкою: контент під ним розмивається і тане
	const EDGE_H = 18;
	// Висота навігації сайту (h-14): тут стоїть шар до першого виміру
	const HEADER_H = 56;

	// Назва міста: базовий кегль і мінімальний масштаб для довгих назв
	const CITY_SIZE = 30;
	const CITY_MIN_SCALE = 0.68;
	// На телефоні у згорнутій шапці назва менша: 30 → 24 px
	const CITY_COLLAPSED_SCALE_MOBILE = 0.8;

	// Рядки розгорнутого блоку: позиція і висота — для зникання під назвою міста
	const ROWS = {
		temp: { top: 54, h: 80 },
		condition: { top: 140, h: 26 },
		feels: { top: 168, h: 20 }
	} as const;

	let spacerEl = $state<HTMLElement | null>(null);
	let cityEl = $state<HTMLElement | null>(null);
	let cityTextEl = $state<HTMLElement | null>(null);

	// Положення шару на екрані, його видима висота і зсув розгорнутого блоку
	let layerY = $state(HEADER_H);
	let visible = $state(H_EXPANDED);
	let shift = $state(0);
	let cityScale = $state(1);
	let mobile = $state(false);

	$effect(() => {
		const query = window.matchMedia('(max-width: 639px)');
		const sync = () => (mobile = query.matches);
		sync();
		query.addEventListener('change', sync);
		return () => query.removeEventListener('change', sync);
	});

	$effect(() => {
		const spacer = spacerEl;
		const cityBox = cityEl;
		const cityText = cityTextEl;
		if (!spacer || !cityBox || !cityText) return;

		let spacerTop = HEADER_H;
		let appliedScale = 1;
		let frame = 0;
		let lastY = -1;
		let lastVisible = -1;

		// Довга назва зменшується, щоб поміститися в рядок, а не обрізатися трьома крапками
		const fitCity = () => {
			const natural = cityText.offsetWidth / appliedScale;
			const available = cityBox.clientWidth;
			const next = natural > 0 ? Math.min(1, Math.max(CITY_MIN_SCALE, available / natural)) : 1;
			if (Math.abs(next - appliedScale) > 0.005) {
				appliedScale = next;
				cityScale = next;
			}
		};

		const update = () => {
			frame = 0;
			// Де зараз розпірка на екрані
			const top = spacerTop - Math.max(window.scrollY, 0);
			// Шар їде разом із навігацією, доки не впреться у верх екрана
			const nextY = Math.max(0, top);
			// Від верху шару до початку контенту
			const span = top + H_EXPANDED - nextY;
			const nextVisible = Math.min(Math.max(span, H_COLLAPSED), H_EXPANDED);

			if (Math.abs(nextY - lastY) > 0.05 || Math.abs(nextVisible - lastVisible) > 0.05) {
				lastY = nextY;
				lastVisible = nextVisible;
				layerY = nextY;
				visible = nextVisible;
				shift = Math.min(Math.max(H_EXPANDED - span, 0), H_EXPANDED);
			}
		};

		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};

		// Виміри — лише при старті, зміні розміру і підвантаженні шрифту, ніколи під час прокрутки
		const remeasure = () => {
			spacerTop = spacer.getBoundingClientRect().top + window.scrollY;
			fitCity();
			lastY = -1;
			update();
		};

		remeasure();
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', remeasure);
		document.fonts?.ready.then(remeasure);

		return () => {
			if (frame) cancelAnimationFrame(frame);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', remeasure);
		};
	});

	const clamp = (v: number) => Math.min(Math.max(v, 0), 1);

	// smoothstep на відрізку [a, b]
	const smooth = (a: number, b: number, v: number) => {
		const t = clamp((v - a) / (b - a));
		return t * t * (3 - 2 * t);
	};

	// 0 — розгорнуто, 1 — згорнуто
	const progress = $derived((H_EXPANDED - visible) / (H_EXPANDED - H_COLLAPSED));

	// Межа, під якою видно розгорнутий блок: спершу під містом, наприкінці — під рядком
	const clipTop = $derived(CITY_BOTTOM + (LINE_BOTTOM - CITY_BOTTOM) * smooth(0, 0.8, progress));

	// Мʼякий край маски: у спокої різкий (нічого не затінено), при прокрутці — 18 px розтушовки
	const fadeBand = $derived(0.01 + 18 * smooth(0, 0.12, progress));

	// Розгорнуті рядки повністю зникають раніше, ніж проявиться згорнутий рядок
	const rowsFade = $derived(1 - smooth(0.55, 0.8, progress));

	function rowOpacity(row: { top: number; h: number }) {
		const hidden = clamp((clipTop - (row.top - shift)) / row.h);
		return (1 - smooth(0, 0.9, hidden)) * rowsFade;
	}

	// Проявляється, поки розгорнуті рядки ще гаснуть: по висоті вони не перетинаються,
	// а перекриття в часі прибирає «провал», коли в шапці лишається саме місто
	const lineOpacity = $derived(smooth(0.55, 0.9, progress));

	// Згортаючись, назва міста на телефоні плавно зменшується
	const collapseScale = $derived(
		mobile ? 1 - (1 - CITY_COLLAPSED_SCALE_MOBILE) * smooth(0, 1, progress) : 1
	);
	const edgeOpacity = $derived(smooth(0.7, 1, progress));

	const mask = $derived(
		`linear-gradient(to bottom, transparent ${clipTop}px, #000 ${clipTop + fadeBand}px)`
	);
</script>

<!-- Місце під розгорнуту шапку в потоці сторінки; висота стала -->
<div bind:this={spacerEl} style="height: {H_EXPANDED}px" aria-hidden="true"></div>

<div
	class="fixed inset-x-0 top-0 z-30 bg-background will-change-transform"
	style="height: {H_EXPANDED}px; transform: translateY({layerY}px); clip-path: inset(0 0 {H_EXPANDED -
		visible}px 0)"
>
	<div class="relative mx-auto h-full max-w-[980px]">
		<!-- Назва міста -->
		<h1
			bind:this={cityEl}
			class="absolute inset-x-4 top-[10px] overflow-hidden text-center leading-[38px] font-semibold tracking-[-0.02em] whitespace-nowrap sm:inset-x-6"
			style="font-size: {CITY_SIZE *
				cityScale}px; transform: scale({collapseScale}); transform-origin: 50% 70%"
			title={city}
		>
			<!-- Для пошуковиків і скрінрідерів заголовок — «Погода Харків» -->
			<span class="sr-only">Погода&nbsp;</span><span bind:this={cityTextEl} class="inline-block"
				>{city}</span
			>
		</h1>

		<!-- Згорнутий рядок: 18° | Похмуро -->
		<p
			class="absolute inset-x-4 top-[50px] flex items-center justify-center gap-2 text-[15px] leading-[24px] font-medium sm:inset-x-6 sm:text-[17px]"
			style="opacity: {lineOpacity}; transform: translateY({(1 - lineOpacity) * 6}px)"
			aria-hidden="true"
		>
			<span class="tabular-nums">{Math.round(temperature)}°</span>
			<span class="font-normal text-separator">|</span>
			<span>{getWeatherText(weather)}</span>
		</p>

		<!-- Розгорнутий блок: їде разом зі сторінкою і мʼяко ховається під назвою міста -->
		<div class="absolute inset-0" style="mask-image: {mask}; -webkit-mask-image: {mask}">
			<div class="relative h-full will-change-transform" style="transform: translateY({-shift}px)">
				<p
					class="absolute inset-x-4 top-[54px] text-center text-[80px] leading-[80px] font-semibold tracking-[-0.04em] tabular-nums sm:inset-x-6"
					style="opacity: {rowOpacity(ROWS.temp)}"
				>
					{Math.round(temperature)}<span class="font-normal text-tertiary">°</span>
				</p>

				<p
					class="absolute inset-x-4 top-[140px] text-center text-[19px] leading-[26px] font-medium sm:inset-x-6"
					style="opacity: {rowOpacity(ROWS.condition)}"
				>
					{getWeatherText(weather)}
				</p>

				<p
					class="absolute inset-x-4 top-[168px] text-center text-[14px] leading-[20px] text-tertiary sm:inset-x-6"
					style="opacity: {rowOpacity(ROWS.feels)}"
				>
					Відчувається як {Math.round(isFelt)}°
				</p>
			</div>
		</div>
	</div>
</div>

<!--
	Мʼякий край замість лінії: смуга одразу під шапкою розмиває контент, що заходить під неї,
	і переходить у фон. Окремий шар, бо clip-path шапки обрізав би все нижче її краю.
-->
<div
	class="soft-edge pointer-events-none fixed inset-x-0 top-0 z-30"
	style="height: {EDGE_H}px; transform: translateY({layerY + visible}px); opacity: {edgeOpacity}"
	aria-hidden="true"
></div>

<style>
	.soft-edge {
		background: linear-gradient(to bottom, var(--background), transparent);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		mask-image: linear-gradient(to bottom, #000, transparent);
		-webkit-mask-image: linear-gradient(to bottom, #000, transparent);
		will-change: transform;
	}
</style>
