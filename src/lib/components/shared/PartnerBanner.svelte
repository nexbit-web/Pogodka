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
		<!-- width/height задають пропорції заздалегідь, щоб сторінка не стрибала при завантаженні -->
		<img
			src="/lilylook.baner.avif"
			alt={i18n.t.partnerAlt}
			width="2172"
			height="724"
			loading="lazy"
			decoding="async"
			class="block h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.015] dark:brightness-[0.92]"
		/>
	</a>
</aside>
