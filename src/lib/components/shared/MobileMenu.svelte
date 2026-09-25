<script lang="ts">
	import { tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import X from '@lucide/svelte/icons/x';
	import ThemeSwitch from './ThemeSwitch.svelte';

	/*
		Бокове меню для телефона. Логотип, тема й посилання живуть тут,
		а в шапці лишаються тільки кнопка меню і пошук.
	*/

	let open = $state(false);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let panelEl = $state<HTMLElement | null>(null);
	let closeEl = $state<HTMLButtonElement | null>(null);

	async function show() {
		open = true;

		await tick();
		closeEl?.focus();
	}

	function hide(returnFocus = true) {
		if (!open) return;
		open = false;
		if (returnFocus) triggerEl?.focus();
	}

	// Перехід на іншу сторінку закриває меню
	afterNavigate(() => hide(false));

	// Під відкритим меню сторінка не прокручується
	$effect(() => {
		if (!open) return;
		const root = document.documentElement;
		const previous = root.style.overflow;
		root.style.overflow = 'hidden';
		return () => {
			root.style.overflow = previous;
		};
	});

	// Esc закриває, Tab ходить по колу всередині меню
	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			hide();
			return;
		}
		if (event.key !== 'Tab' || !panelEl) return;

		const focusable = Array.from(
			panelEl.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
		);
		const first = focusable[0];
		const last = focusable.at(-1);

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last?.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first?.focus();
		}
	}

	const isCurrent = (href: string) => page.url.pathname === href;

	const LINKS = [
		{ href: resolve('/about'), label: 'Про нас' },
		{ href: resolve('/support'), label: 'Техпідтримка' },
		{ href: resolve('/privacypolicy'), label: 'Політика конфіденційності' },
		{ href: resolve('/agreement'), label: 'Умови використання' }
	];
</script>

<!-- Кнопка меню: три лінії -->
<button
	bind:this={triggerEl}
	type="button"
	onclick={show}
	aria-label="Відкрити меню"
	aria-haspopup="dialog"
	aria-expanded={open}
	aria-controls="mobile-menu"
	class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground transition-colors hover:bg-fill"
>
	<svg class="size-[18px]" viewBox="0 0 18 18" fill="none" aria-hidden="true">
		<path
			d="M2 4h14M2 9h14M2 14h14"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
		/>
	</svg>
</button>

{#if open}
	<!-- Затемнення: клік по ньому закриває меню -->
	<div
		class="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[2px]"
		onclick={() => hide()}
		aria-hidden="true"
		transition:fade={{ duration: 200 }}
	></div>

	<div
		bind:this={panelEl}
		id="mobile-menu"
		role="dialog"
		aria-modal="true"
		aria-label="Меню"
		tabindex="-1"
		onkeydown={onKeydown}
		class="fixed inset-y-0 left-0 z-[61] flex w-[min(86vw,22rem)] flex-col bg-background shadow-[8px_0_40px_rgba(0,0,0,0.18)]"
		transition:fly={{ x: -360, duration: 280, easing: cubicOut, opacity: 1 }}
	>
		<!-- Логотип і закриття -->
		<div class="flex h-14 shrink-0 items-center justify-between px-4">
			<a
				href={resolve('/')}
				onclick={() => hide(false)}
				class="flex items-center gap-2 text-foreground"
				aria-label="Pogodka — на головну"
			>
				<svg class="h-6 w-auto shrink-0" viewBox="0 0 574 408" aria-hidden="true">
					<use href="/icons.svg?v=11#favicon"></use>
				</svg>
				<span class="text-[20px] font-semibold tracking-[-0.02em]">Pogodka</span>
			</a>

			<button
				bind:this={closeEl}
				type="button"
				onclick={() => hide()}
				aria-label="Закрити меню"
				class="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-fill hover:text-foreground"
			>
				<X class="size-5" />
			</button>
		</div>

		<div class="scroll-y flex-1 px-4 pb-8">
			<!-- Налаштування -->
			<section aria-labelledby="menu-theme" class="pt-4">
				<h2 id="menu-theme" class="mb-2 px-1 text-[13px] text-tertiary">Тема</h2>
				<ThemeSwitch />
			</section>

			<!-- Інформація -->
			<nav aria-label="Інформація" class="mt-8 border-t border-separator pt-4">
				<ul>
					{#each LINKS as link (link.href)}
						<li>
							<a
								href={link.href}
								onclick={() => hide(false)}
								aria-current={isCurrent(link.href) ? 'page' : undefined}
								class="block px-1 py-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<p class="mt-6 px-1 text-[13px] text-tertiary">
				Стежте за нами:
				<a
					href="https://www.youtube.com/@Pogodka-UA"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary hover:underline">YouTube</a
				>
			</p>
		</div>
	</div>
{/if}
