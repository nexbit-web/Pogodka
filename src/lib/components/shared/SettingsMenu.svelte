<script lang="ts">
	import Settings from '@lucide/svelte/icons/settings';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import Monitor from '@lucide/svelte/icons/monitor';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	type Theme = 'light' | 'dark' | 'system';

	const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
		{ value: 'light', label: 'Світла', icon: Sun },
		{ value: 'dark', label: 'Темна', icon: Moon },
		{ value: 'system', label: 'Як у системі', icon: Monitor }
	];
</script>

<!-- Налаштування сайту. Поки тут лише тема, сюди ж додаватимуться інші параметри -->
<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-fill hover:text-foreground"
		aria-label="Налаштування"
	>
		<Settings class="size-[18px]" />
	</DropdownMenu.Trigger>

	<DropdownMenu.Content align="end" class="w-52">
		<DropdownMenu.Label class="text-[11px] tracking-[0.06em] text-tertiary uppercase">
			Тема
		</DropdownMenu.Label>

		<DropdownMenu.RadioGroup
			value={userPrefersMode.current}
			onValueChange={(value) => setMode(value as Theme)}
		>
			{#each themes as theme (theme.value)}
				<DropdownMenu.RadioItem value={theme.value} class="cursor-pointer text-[13px]">
					<theme.icon class="size-4 text-muted-foreground" />
					{theme.label}
				</DropdownMenu.RadioItem>
			{/each}
		</DropdownMenu.RadioGroup>
	</DropdownMenu.Content>
</DropdownMenu.Root>
