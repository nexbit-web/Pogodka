<script lang="ts">
	import { i18n } from '$lib/i18n/state.svelte';
</script>

<!-- Банер LilyLook — власний продукт, повʼязаний із сайтом, тож без позначки «Реклама» -->
<aside aria-label={i18n.t.partnerLabel}>
	<a
		href="https://lilylook.store/?utm_source=pogodka&utm_medium=banner&utm_campaign=partner"
		target="_blank"
		rel="noopener"
		class="group block overflow-hidden rounded-2xl"
	>
		<!--
			width/height задають пропорції заздалегідь, щоб сторінка не стрибала при завантаженні.
			Браузер бере копію під свій екран: телефону вистачає 720 px (22 КБ),
			а не оригіналу на 2172 px (130 КБ). Найбільша — 932 px банера на ретіна-екрані.
		-->
		<img
			src="/banner/lilylook-1080.avif"
			srcset="/banner/lilylook-720.avif 720w, /banner/lilylook-1080.avif 1080w, /banner/lilylook-1440.avif 1440w, /banner/lilylook-1864.avif 1864w"
			sizes="(min-width: 980px) 932px, (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
			alt={i18n.t.partnerAlt}
			width="1864"
			height="621"
			loading="lazy"
			decoding="async"
			class="block h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.015] dark:brightness-[0.92]"
		/>
	</a>
</aside>
