<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	interface Props {
		icon: Component;
		label: string;
		value: string;
		unit?: string;
		caption?: string;
		/** Додатковий вміст праворуч від значення (наприклад, стрілка вітру) */
		adornment?: Snippet;
	}

	let { icon: Icon, label, value, unit, caption, adornment }: Props = $props();
</script>

<div class="flex flex-col gap-2 py-5">
	<!-- Назва показника -->
	<div
		class="flex items-center gap-1.5 text-xs font-medium tracking-[0.04em] text-tertiary uppercase"
	>
		<Icon size={14} aria-hidden="true" />
		<span>{label}</span>
	</div>

	<!-- Значення -->
	<div class="flex items-baseline gap-2">
		<span class="text-[1.75rem] leading-none font-semibold tabular-nums sm:text-[2rem]">
			{value}{#if unit}<span class="ml-0.5 text-lg font-normal text-muted-foreground">{unit}</span
				>{/if}
		</span>
		{#if adornment}
			{@render adornment()}
		{/if}
	</div>

	<!-- Пояснення -->
	{#if caption}
		<p class="text-[0.8125rem] text-muted-foreground">{caption}</p>
	{/if}
</div>
