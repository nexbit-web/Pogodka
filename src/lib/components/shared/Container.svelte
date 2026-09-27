<script lang="ts">
	import type { Snippet } from 'svelte';

	/*
		class — інша максимальна ширина замість типової (max-w-[700px] для текстових сторінок).
		Без tailwind-merge: він важить ~8 КБ і потрапляв би на кожну сторінку погоди
		заради одного-єдиного класу, який тут просто замінюється.
	*/
	let { children, class: width = 'max-w-[980px]' }: { children: Snippet; class?: string } =
		$props();
</script>

<!-- 980px — контентна ширина apple.com -->
<div class={['mx-auto w-full px-4 sm:px-6', width]}>
	{@render children()}
</div>
