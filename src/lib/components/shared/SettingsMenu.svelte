<script lang="ts">
	import Settings from '@lucide/svelte/icons/settings';
	import Check from '@lucide/svelte/icons/check';
	import { tick } from 'svelte';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { THEMES, asTheme, type Theme } from '$lib/theme';

	/*
		Власне легке меню замість bits-ui: воно в шапці кожної сторінки,
		а бібліотека меню додавала десятки кілобайт до першого завантаження.
		Поведінка як у системного меню: Esc і клік поза ним закривають,
		стрілки ходять по пунктах, фокус повертається на кнопку.
	*/

	const current = $derived(asTheme(userPrefersMode.current));

	let open = $state(false);
	let rootEl = $state<HTMLElement | null>(null);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let menuEl = $state<HTMLElement | null>(null);

	const items = () =>
		Array.from(menuEl?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);

	async function toggle() {
		open = !open;
		if (!open) return;
		// Після відкриття фокус — на вибраному пункті (одразу, без гонки з натисканнями клавіш)
		await tick();
		const list = items();
		(list.find((el) => el.getAttribute('aria-checked') === 'true') ?? list[0])?.focus();
	}

	function close(returnFocus = true) {
		open = false;
		if (returnFocus) triggerEl?.focus();
	}

	function choose(theme: Theme) {
		setMode(theme);
		close();
	}

	// Клік поза меню закриває його, не перехоплюючи фокус
	$effect(() => {
		if (!open) return;
		const onPointer = (event: PointerEvent) => {
			if (rootEl && !rootEl.contains(event.target as Node)) close(false);
		};
		document.addEventListener('pointerdown', onPointer);
		return () => document.removeEventListener('pointerdown', onPointer);
	});

	function onMenuKeydown(event: KeyboardEvent) {
		const list = items();
		const idx = list.indexOf(document.activeElement as HTMLElement);

		if (event.key === 'Escape' || event.key === 'Tab') {
			if (event.key === 'Escape') event.preventDefault();
			close(event.key === 'Escape');
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			list[(idx + 1) % list.length]?.focus();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			list[(idx - 1 + list.length) % list.length]?.focus();
		} else if (event.key === 'Home') {
			event.preventDefault();
			list[0]?.focus();
		} else if (event.key === 'End') {
			event.preventDefault();
			list.at(-1)?.focus();
		}
	}
</script>

<!-- Налаштування сайту. Поки тут лише тема, сюди ж додаватимуться інші параметри -->
<div class="relative" bind:this={rootEl}>
	<button
		bind:this={triggerEl}
		type="button"
		onclick={toggle}
		aria-label="Налаштування"
		aria-haspopup="menu"
		aria-expanded={open}
		aria-controls="settings-menu"
		class="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-fill hover:text-foreground"
	>
		<Settings class="size-[18px]" />
	</button>

	{#if open}
		<div
			bind:this={menuEl}
			id="settings-menu"
			role="menu"
			tabindex="-1"
			aria-label="Налаштування"
			onkeydown={onMenuKeydown}
			class="absolute top-[calc(100%+6px)] right-0 z-50 w-52 rounded-md border border-separator bg-popover p-1 text-popover-foreground shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
		>
			<p class="px-2 py-1.5 text-[11px] tracking-[0.06em] text-tertiary uppercase">Тема</p>

			{#each THEMES as theme (theme.value)}
				{@const checked = current === theme.value}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={checked}
					tabindex="-1"
					onclick={() => choose(theme.value)}
					class="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] outline-none hover:bg-fill focus-visible:bg-fill focus-visible:outline-none"
				>
					<theme.icon class="size-4 text-muted-foreground" />
					<span class="flex-1">{theme.label}</span>
					{#if checked}
						<Check class="size-4 text-primary" />
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
