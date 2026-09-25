<script lang="ts">
	import { getTempColor } from '$lib/weather';
	import { signed } from '$lib/dayInsights';

	interface Props {
		/** Температури по колонках таблиці */
		temps: number[];
	}

	/*
		Лише крива й підписи. Розділювачі частин доби й підсвітку «зараз» дають
		клітинки таблиці під кривою — так лінії збігаються з рештою таблиці до пікселя.
	*/
	let { temps }: Props = $props();

	// Система координат SVG: 100 одиниць на колонку, 100 — на висоту
	const COL = 100;
	const TOP = 38; // над найвищою точкою лишається місце під підпис
	const BOTTOM = 88;

	const n = $derived(temps.length);
	const width = $derived(n * COL);

	const points = $derived.by(() => {
		const lo = Math.min(...temps);
		const hi = Math.max(...temps);
		const span = hi - lo || 1;
		return temps.map((t, i) => ({
			x: (i + 0.5) * COL,
			// Рівна температура протягом дня — лінія посередині, а не притиснута донизу
			y: hi === lo ? (TOP + BOTTOM) / 2 : BOTTOM - ((t - lo) / span) * (BOTTOM - TOP),
			t
		}));
	});

	/*
		Монотонна кубічна крива (Fritsch–Carlson): плавна, але не «вигадує»
		горбів між точками, яких немає в даних.
	*/
	const linePath = $derived.by(() => {
		const p = points;
		if (p.length < 2) return '';

		const dx = p.slice(1).map((q, i) => q.x - p[i].x);
		const slope = p.slice(1).map((q, i) => (q.y - p[i].y) / dx[i]);
		const tangent = p.map((_, i) => {
			if (i === 0) return slope[0];
			if (i === p.length - 1) return slope[i - 1];
			if (slope[i - 1] * slope[i] <= 0) return 0;
			return (slope[i - 1] + slope[i]) / 2;
		});

		let d = `M ${p[0].x} ${p[0].y}`;
		for (let i = 0; i < p.length - 1; i++) {
			const h = dx[i] / 3;
			d += ` C ${p[i].x + h} ${p[i].y + tangent[i] * h}, ${p[i + 1].x - h} ${p[i + 1].y - tangent[i + 1] * h}, ${p[i + 1].x} ${p[i + 1].y}`;
		}
		return d;
	});

	const areaPath = $derived(
		linePath ? `${linePath} L ${points.at(-1)!.x} 100 L ${points[0].x} 100 Z` : ''
	);

	// Стабільний id: однаковий на сервері й у браузері
	const uid = $props.id();
	const gradientId = `temp-gradient-${uid}`;
</script>

<div class="relative h-full" role="img" aria-label={`Температура: ${temps.map(signed).join(', ')}`}>
	<svg
		class="absolute inset-0 h-full w-full overflow-visible"
		viewBox="0 0 {width} 100"
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		<defs>
			<linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
				{#each points as point (point.x)}
					<stop offset={point.x / width} stop-color={getTempColor(point.t)} />
				{/each}
			</linearGradient>
		</defs>

		<path d={areaPath} fill="url(#{gradientId})" opacity="0.14" />
		<path
			d={linePath}
			fill="none"
			stroke="url(#{gradientId})"
			stroke-width="2.5"
			stroke-linecap="round"
			vector-effect="non-scaling-stroke"
		/>
	</svg>

	<!-- Точки й підписи — у HTML, щоб не розтягувались разом із SVG -->
	{#each points as point, i (point.x)}
		<div
			class="absolute flex flex-col items-center"
			style="left: {((i + 0.5) / n) *
				100}%; top: {point.y}%; transform: translate(-50%, calc(-100% + 4px))"
		>
			<span class="mb-1.5 text-[15px] leading-none font-semibold tabular-nums sm:text-[17px]">
				{signed(point.t)}
			</span>
			<span
				class="size-2 rounded-full ring-2 ring-background"
				style="background: {getTempColor(point.t)}"
			></span>
		</div>
	{/each}
</div>
