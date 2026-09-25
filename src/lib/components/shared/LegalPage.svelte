<script lang="ts">
	import { resolve } from '$app/paths';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Container from './Container.svelte';
	import Footer from './Footer.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		updated: string;
		updatedLabel: string;
		children: Snippet;
	}

	let { title, updated, updatedLabel, children }: Props = $props();
</script>

<Container class="max-w-[700px]">
	<!-- Назад -->
	<a
		href={resolve('/')}
		class="mt-10 inline-flex items-center gap-0.5 text-[0.9375rem] text-primary hover:underline"
	>
		<ChevronLeft size={16} aria-hidden="true" />
		На головну
	</a>

	<h1 class="mt-6 text-[2.5rem] leading-tight font-semibold tracking-[-0.03em] sm:text-[3rem]">
		{title}
	</h1>

	<p class="mt-3 text-[0.875rem] text-tertiary">
		Останнє оновлення: <time datetime={updated}>{updatedLabel}</time>
	</p>

	<!--
		Типографіка правових сторінок: вужча колонка, спокійний сірий текст,
		заголовки розділів відбиваються повітрям, а не лініями.
	-->
	<div class="legal mt-10 pb-8">
		{@render children()}
	</div>
</Container>

<Footer breadcrumb={title} />

<style>
	.legal :global(h2) {
		margin-top: 2.75rem;
		margin-bottom: 0.75rem;
		font-size: 1.375rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--foreground);
	}

	.legal :global(p) {
		margin: 0 0 0.875rem;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--muted-foreground);
	}

	.legal :global(ul) {
		margin: 0 0 1.25rem;
		padding-left: 1.125rem;
		list-style: disc;
	}

	.legal :global(li) {
		margin-bottom: 0.375rem;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--muted-foreground);
	}

	.legal :global(a) {
		color: var(--primary);
	}

	.legal :global(a:hover) {
		text-decoration: underline;
	}
</style>
