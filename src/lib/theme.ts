import Sun from '@lucide/svelte/icons/sun';
import Moon from '@lucide/svelte/icons/moon';

/*
	Теми сайту. Системної немає навмисно: за замовчуванням завжди світла,
	темну користувач вмикає сам (у меню налаштувань або в мобільному меню).
*/
export type Theme = 'light' | 'dark';

export const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
	{ value: 'light', label: 'Світла', icon: Sun },
	{ value: 'dark', label: 'Темна', icon: Moon }
];

/** Поточна тема з того, що зберіг mode-watcher; усе інше — світла */
export const asTheme = (mode: string | undefined): Theme => (mode === 'dark' ? 'dark' : 'light');
