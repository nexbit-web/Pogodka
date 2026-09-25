<script lang="ts">
	import type { Component } from 'svelte';

	interface Props {
		icon?: Component;
		title: string;
		id: string;
	}

	let { icon: Icon, title, id }: Props = $props();
</script>

<!-- Заголовок секції: дрібний, розріджений, приглушений — як на apple.com -->
<h2
	{id}
	class="flex items-center gap-1.5 text-xs font-medium tracking-[0.06em] text-tertiary uppercase"
>
	{#if Icon}
		<Icon size={14} aria-hidden="true" />
	{/if}
	{title}
</h2>
