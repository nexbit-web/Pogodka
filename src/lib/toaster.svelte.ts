import type { Toaster as ToasterComponent } from '$lib/components/ui/sonner';

/*
	Сповіщення (svelte-sonner) потрібні лише формі техпідтримки. Їхній код разом із
	tailwind-merge важить ~24 КБ, тож вантажиться, тільки коли людина відкрила техпідтримку.
	Сам компонент живе в кореневому layout: «Повідомлення надіслано» показується вже
	на головній, куди форма переходить після відправки.
*/
export const toaster = $state<{ component: typeof ToasterComponent | null }>({ component: null });

export function loadToaster() {
	if (toaster.component) return;
	import('$lib/components/ui/sonner').then((m) => (toaster.component = m.Toaster));
}
