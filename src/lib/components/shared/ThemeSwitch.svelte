<script lang="ts">
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { THEMES, asTheme } from '$lib/theme';

	// Сегментований перемикач, як у налаштуваннях iOS: вибраний сегмент — біла «пігулка»
	const current = $derived(asTheme(userPrefersMode.current));
</script>

<div
	role="radiogroup"
	aria-label="Тема"
	class="grid grid-cols-2 gap-0.5 rounded-[10px] bg-fill p-0.5"
>
	{#each THEMES as theme (theme.value)}
		{@const checked = current === theme.value}
		<button
			type="button"
			role="radio"
			aria-checked={checked}
			onclick={() => setMode(theme.value)}
			class="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-[14px] transition-colors {checked
				? 'bg-background font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:bg-[#48484a]'
				: 'font-medium text-muted-foreground hover:text-foreground'}"
		>
			<theme.icon class="size-4" aria-hidden="true" />
			{theme.label}
		</button>
	{/each}
</div>
