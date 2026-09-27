<script lang="ts">
	import { LANGS } from '$lib/i18n';
	import { i18n, rememberLang } from '$lib/i18n/state.svelte';

	// Той самий сегментований перемикач, що й тема. Сегменти — посилання на цю ж сторінку іншою мовою
	let { onchoose }: { onchoose?: () => void } = $props();
</script>

<nav aria-label={i18n.t.language} class="grid grid-cols-2 gap-0.5 rounded-[10px] bg-fill p-0.5">
	{#each LANGS as lang (lang.id)}
		{@const checked = i18n.lang === lang.id}
		<a
			href={i18n.switchHref(lang.id)}
			hreflang={lang.hreflang}
			lang={lang.hreflang}
			aria-current={checked ? 'true' : undefined}
			data-sveltekit-noscroll
			onclick={() => {
				rememberLang(lang.id);
				onchoose?.();
			}}
			class="flex h-9 items-center justify-center rounded-lg text-[14px] transition-colors {checked
				? 'bg-background font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:bg-[#48484a]'
				: 'font-medium text-muted-foreground hover:text-foreground'}"
		>
			{lang.label}
		</a>
	{/each}
</nav>
