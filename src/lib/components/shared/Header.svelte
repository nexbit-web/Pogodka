<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import { clearHistory, readHistory } from '$lib/cityHistory';
	import { locateNearestCity } from '$lib/geolocate';
	import SettingsMenu from './SettingsMenu.svelte';
	import MobileMenu from './MobileMenu.svelte';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Navigation from '@lucide/svelte/icons/navigation';
	import type { CitySearchResult } from '$lib/types';

	let { class: className }: { class?: string } = $props();

	// Рядок випадайки: знайдений або з історії
	interface CityRow {
		path: string;
		nameUa: string;
		region: string;
	}

	let focused = $state(false);
	let query = $state('');
	let cities = $state<CitySearchResult[]>([]);
	let loading = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	// Підсвічений рядок у випадайці (для стрілок на клавіатурі)
	let activeIndex = $state(-1);

	// Історія переглянутих — читаємо при кожному фокусі, щоб вона була свіжою.
	// Населений пункт, який зараз відкрито, у ній не показуємо: він і так на екрані
	let history = $state<CityRow[]>([]);
	function loadHistory() {
		history = readHistory()
			.filter((c) => `/pohoda/${c.path}` !== page.url.pathname)
			.map((c) => ({ path: c.path, nameUa: c.name, region: c.region }));
	}

	function forgetHistory() {
		clearHistory();
		history = [];
		inputEl?.focus();
	}

	// «Моє місцезнаходження»: найближчий населений пункт за геолокацією пристрою
	let canLocate = $state(false);
	let locating = $state(false);
	let geoError = $state('');
	$effect(() => {
		canLocate = 'geolocation' in navigator;
	});

	async function locate() {
		geoError = '';
		locating = true;
		try {
			const path = await locateNearestCity();
			close();
			inputEl?.blur();
			goto(resolve('/pohoda/[city]', { city: path }));
		} catch (err) {
			geoError = err instanceof Error ? err.message : 'Не вдалося визначити місцезнаходження';
		} finally {
			locating = false;
		}
	}

	// Пошук із дебаунсом 400 мс
	$effect(() => {
		const value = query.trim();

		if (value.length < 2) {
			cities = [];
			loading = false;
			return;
		}

		loading = true;
		const controller = new AbortController();

		const timer = setTimeout(() => {
			fetch(`/api/cities/search?q=${encodeURIComponent(value)}`, { signal: controller.signal })
				.then((res) => res.json())
				.then((data: CitySearchResult[]) => {
					cities = data;
					loading = false;
				})
				.catch((err) => {
					if (err.name !== 'AbortError') loading = false;
				});
		}, 400);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	// Поле порожнє — місцезнаходження та історія; інакше — підказки пошуку, як і раніше
	const showHistory = $derived(query.trim().length < 2);
	const displayCities = $derived<CityRow[]>(showHistory ? history : cities);
	// Випадайка лише тоді, коли в ній є що показати
	const open = $derived(focused && (!showHistory || history.length > 0 || canLocate));

	// Новий список — скидаємо підсвічування
	$effect(() => {
		void displayCities;
		activeIndex = -1;
	});

	function clear() {
		query = '';
		cities = [];
		inputEl?.focus();
	}

	function close() {
		focused = false;
		query = '';
		cities = [];
		activeIndex = -1;
		geoError = '';
	}

	function cityHref(city: CityRow) {
		return resolve('/pohoda/[city]', { city: city.path });
	}

	// Enter або кнопка пошуку — відкриваємо підсвічене місто, інакше перше в списку.
	// Порожнє поле — кнопка просто ставить у нього курсор, а не мовчить.
	// Результати ще не прийшли — сторінка /pohoda/{назва} сама знайде населений пункт за назвою.
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const value = query.trim();
		const target = displayCities[activeIndex] ?? (showHistory ? undefined : displayCities[0]);

		if (!target && value.length < 2) {
			inputEl?.focus();
			return;
		}
		const href = target
			? cityHref(target)
			: resolve('/pohoda/[city]', { city: value.replace(/[/?#\\]+/g, ' ').trim() });

		close();
		inputEl?.blur();
		goto(href);
	}

	function onKeydown(event: KeyboardEvent) {
		if (!focused) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			activeIndex = Math.min(activeIndex + 1, displayCities.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = Math.max(activeIndex - 1, -1);
		} else if (event.key === 'Escape') {
			close();
			inputEl?.blur();
		}
	}

	// Підсвічений рядок прокручуємо у видиму область списку
	function keepInView(node: HTMLElement, active: boolean) {
		const apply = (isActive: boolean) => {
			if (isActive) node.scrollIntoView({ block: 'nearest' });
		};
		apply(active);
		return { update: apply };
	}
</script>

<!-- Шапка не липка: прокручується разом зі сторінкою -->
<header class={cn('relative z-50 bg-background', className)}>
	<div
		class="mx-auto grid h-14 max-w-[980px] grid-cols-[auto_1fr] items-center gap-2 px-4 sm:grid-cols-[auto_1fr_auto] sm:gap-3 sm:px-6 md:grid-cols-[1fr_minmax(0,30rem)_1fr] md:gap-6"
	>
		<!-- Логотип і назва — одним кольором. На телефоні вони переїжджають у бокове меню -->
		<a
			href={resolve('/')}
			class="flex items-center gap-2 justify-self-start text-foreground transition-opacity hover:opacity-70 max-sm:hidden"
			aria-label="Pogodka — на головну"
		>
			<svg class="h-6 w-auto shrink-0" viewBox="0 0 574 408" aria-hidden="true">
				<use href="/icons.svg?v=11#favicon"></use>
			</svg>
			<span class="text-[20px] font-semibold tracking-[-0.02em]">Pogodka</span>
		</a>

		<!-- Телефон: кнопка бокового меню ліворуч від пошуку -->
		<div class="sm:hidden">
			<MobileMenu />
		</div>

		<!-- Пошук: поле з хрестиком і приєднана кнопка.
		     На телефоні випадайка на всю ширину шапки, а не лише під полем -->
		<div class="w-full sm:relative">
			<!-- Поле й кнопка — одна група: при фокусі обводка primary охоплює обидва -->
			<form
				role="search"
				class="flex overflow-hidden rounded-lg border border-separator transition-colors focus-within:border-primary"
				onsubmit={submit}
			>
				<label for="city-search" class="sr-only">Пошук міста по Україні</label>

				<div class="relative min-w-0 flex-1">
					<input
						bind:this={inputEl}
						bind:value={query}
						id="city-search"
						type="search"
						autocomplete="off"
						placeholder="Місто або село"
						onfocus={() => {
							focused = true;
							loadHistory();
						}}
						onkeydown={onKeydown}
						role="combobox"
						aria-expanded={open}
						aria-controls="search-results"
						aria-autocomplete="list"
						aria-activedescendant={activeIndex >= 0 ? `city-option-${activeIndex}` : undefined}
						class="h-10 w-full border-0 bg-background pr-10 pl-3 text-[16px] outline-none placeholder:text-tertiary focus:outline-none focus-visible:outline-none sm:h-9 sm:text-[15px]"
					/>

					{#if query.length > 0}
						<button
							type="button"
							onclick={clear}
							aria-label="Очистити пошук"
							class="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center text-tertiary transition-colors hover:text-foreground"
						>
							<X size={16} />
						</button>
					{/if}
				</div>

				<button
					type="submit"
					aria-label="Знайти"
					class="flex h-10 w-14 shrink-0 cursor-pointer items-center justify-center border-l border-separator bg-fill text-muted-foreground transition-colors outline-none hover:bg-[color-mix(in_oklab,var(--fill),var(--foreground)_6%)] hover:text-foreground focus-visible:outline-none sm:h-9"
				>
					<Search size={17} />
				</button>
			</form>

			<!-- Випадайка результатів -->
			{#if open}
				<div
					class="absolute inset-x-4 top-[52px] z-50 overflow-hidden rounded-lg border border-separator bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:inset-x-0 sm:top-[calc(100%+4px)]"
				>
					{#if showHistory}
						<!-- Поле порожнє: спершу своє місцезнаходження, далі переглянуті раніше -->
						{#if canLocate}
							<button
								type="button"
								onclick={locate}
								disabled={locating}
								class="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-[15px] text-primary hover:bg-fill disabled:cursor-default"
							>
								{#if locating}
									<LoaderCircle size={15} class="animate-spin" aria-hidden="true" />
									Визначаємо місцезнаходження…
								{:else}
									<Navigation size={15} aria-hidden="true" />
									Моє місцезнаходження
								{/if}
							</button>
							{#if geoError}
								<p class="px-3 pb-2.5 text-[13px] text-muted-foreground" role="status">
									{geoError}
								</p>
							{/if}
						{/if}
						{#if history.length > 0}
							<!-- Підпис пояснює, звідки ці міста; історію можна стерти — вона лише ваша -->
							<div class="flex items-baseline justify-between px-3 pt-2.5 pb-1">
								<p class="text-[12px] font-medium text-muted-foreground">Нещодавні</p>
								<button
									type="button"
									onclick={forgetHistory}
									class="cursor-pointer text-[12px] text-muted-foreground hover:text-foreground"
								>
									Очистити
								</button>
							</div>
							{@render cityList()}
						{/if}
					{:else if loading && cities.length === 0}
						<p class="flex items-center gap-2 px-3 py-3 text-[15px] text-muted-foreground">
							<LoaderCircle size={16} class="animate-spin" />
							Пошук…
						</p>
					{:else if cities.length > 0}
						{@render cityList()}
					{:else}
						<p class="flex items-center gap-2 px-3 py-3 text-[15px] text-muted-foreground">
							<CircleAlert size={16} />
							Нічого не знайдено
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Налаштування — на планшеті й компʼютері; на телефоні вони в боковому меню -->
		<div class="justify-self-end max-sm:hidden">
			<SettingsMenu />
		</div>
	</div>
</header>

<!-- Список населених пунктів у випадайці: з історії або знайдені -->
{#snippet cityList()}
	<ul
		id="search-results"
		role="listbox"
		aria-label="Населені пункти"
		class="scroll-y max-h-[22rem]"
	>
		{#each displayCities as city, idx (city.path)}
			<li use:keepInView={idx === activeIndex}>
				<a
					id={`city-option-${idx}`}
					href={cityHref(city)}
					role="option"
					aria-selected={idx === activeIndex}
					onclick={close}
					onmouseenter={() => (activeIndex = idx)}
					data-sveltekit-preload-data="off"
					class="block truncate px-3 py-2.5 text-[15px] {idx === activeIndex ? 'bg-fill' : ''}"
				>
					<span class="text-foreground">{city.nameUa}</span
					><!-- У столиці область збігається з назвою: «Київ, Київ» — зайвий повтор -->{#if city.region !== city.nameUa}<span
							class="text-muted-foreground">, {city.region}</span
						>{/if}
				</a>
			</li>
		{/each}
	</ul>
{/snippet}

<!-- Клік поза випадайкою закриває її -->
{#if focused}
	<button
		type="button"
		onclick={close}
		tabindex="-1"
		aria-hidden="true"
		class="fixed inset-0 z-40 cursor-default"
	></button>
{/if}
