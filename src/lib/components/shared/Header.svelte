<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import SettingsMenu from './SettingsMenu.svelte';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import type { CitySearchResult } from '$lib/types';

	let { class: className }: { class?: string } = $props();

	let focused = $state(false);
	let query = $state('');
	let cities = $state<CitySearchResult[]>([]);
	let loading = $state(false);
	let popularCities = $state<CitySearchResult[]>([]);
	let inputEl = $state<HTMLInputElement | null>(null);
	// Підсвічений рядок у випадайці (для стрілок на клавіатурі)
	let activeIndex = $state(-1);

	// Популярні міста підвантажуємо один раз
	$effect(() => {
		let cancelled = false;

		fetch('/api/cities/search?q=')
			.then((r) => r.json())
			.then((data: CitySearchResult[]) => {
				if (!cancelled) popularCities = data;
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	});

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

	const showPopular = $derived(query.trim().length < 2);
	const displayCities = $derived(showPopular ? popularCities : cities);

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
	}

	function cityHref(city: CitySearchResult) {
		return resolve('/pohoda/[city]', { city: city.slug });
	}

	// Enter або кнопка пошуку — відкриваємо підсвічене місто, інакше перше в списку
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const target = displayCities[activeIndex] ?? (showPopular ? undefined : displayCities[0]);
		if (!target) return;
		close();
		inputEl?.blur();
		goto(cityHref(target));
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
		class="mx-auto grid h-14 max-w-[980px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 md:grid-cols-[1fr_minmax(0,26rem)_1fr] md:gap-6"
	>
		<!-- Логотип і назва — одним кольором -->
		<a
			href={resolve('/')}
			class="flex items-center gap-2 justify-self-start text-foreground transition-opacity hover:opacity-70"
			aria-label="Pogodka — на головну"
		>
			<svg class="h-6 w-auto shrink-0" viewBox="0 0 574 408" aria-hidden="true">
				<use href="/icons.svg?v=10#favicon"></use>
			</svg>
			<span class="text-[20px] font-semibold tracking-[-0.02em] max-[380px]:hidden">Pogodka</span>
		</a>

		<!-- Пошук: поле з хрестиком і приєднана кнопка -->
		<div class="relative w-full">
			<!-- Поле й кнопка — одна група: при фокусі обводка primary охоплює обидва -->
			<form
				role="search"
				class="flex overflow-hidden rounded-md border border-separator transition-colors focus-within:border-primary"
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
						placeholder="Пошук міста"
						onfocus={() => (focused = true)}
						onkeydown={onKeydown}
						role="combobox"
						aria-expanded={focused}
						aria-controls="search-results"
						aria-autocomplete="list"
						aria-activedescendant={activeIndex >= 0 ? `city-option-${activeIndex}` : undefined}
						class="h-9 w-full border-0 bg-background pr-8 pl-3 text-[15px] outline-none placeholder:text-tertiary focus:outline-none focus-visible:outline-none"
					/>

					{#if query.length > 0}
						<button
							type="button"
							onclick={clear}
							aria-label="Очистити пошук"
							class="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center text-tertiary transition-colors hover:text-foreground"
						>
							<X size={16} />
						</button>
					{/if}
				</div>

				<button
					type="submit"
					aria-label="Знайти"
					class="flex h-9 w-11 shrink-0 cursor-pointer items-center justify-center border-l border-separator bg-fill outline-none focus-visible:outline-none text-muted-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--fill),var(--foreground)_6%)] hover:text-foreground"
				>
					<Search size={17} />
				</button>
			</form>

			<!-- Випадайка результатів -->
			{#if focused}
				<div
					id="search-results"
					role="listbox"
					aria-label="Результати пошуку міст"
					class="absolute inset-x-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-md border border-separator bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
				>
					{#if loading}
						<p class="flex items-center gap-2 px-3 py-3 text-[15px] text-muted-foreground">
							<LoaderCircle size={16} class="animate-spin" />
							Пошук…
						</p>
					{:else if displayCities.length > 0}
						<ul class="scroll-y max-h-[22rem]">
							{#each displayCities as city, idx (city.id)}
								<li use:keepInView={idx === activeIndex}>
									<a
										id={`city-option-${idx}`}
										href={cityHref(city)}
										role="option"
										aria-selected={idx === activeIndex}
										onclick={close}
										onmouseenter={() => (activeIndex = idx)}
										data-sveltekit-preload-data="off"
										class="block truncate px-3 py-2.5 text-[15px] {idx === activeIndex
											? 'bg-fill'
											: ''}"
									>
										<span class="text-foreground">{city.nameUa}</span><span
											class="text-muted-foreground">, {city.region}</span
										>
									</a>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="flex items-center gap-2 px-3 py-3 text-[15px] text-muted-foreground">
							<CircleAlert size={16} />
							Місто не знайдено
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Налаштування -->
		<div class="justify-self-end">
			<SettingsMenu />
		</div>
	</div>
</header>

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
