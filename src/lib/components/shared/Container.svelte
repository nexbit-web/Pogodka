<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let { children, class: className }: { children: Snippet; class?: string } = $props();
</script>

<!-- 980px — контентна ширина apple.com -->
<div class={cn('mx-auto w-full max-w-[980px] px-4 sm:px-6', className)}>
	{@render children()}
</div>
