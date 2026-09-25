<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
	<title>{page.status} — Pogodka</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div
	class="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center"
>
	<p class="text-7xl font-semibold">{page.status}</p>
	<h1 class="text-2xl font-bold">
		{page.status === 404 ? 'Сторінку не знайдено' : 'Помилка при завантаженні даних'}
	</h1>
	<p class="text-muted-foreground">{page.error?.message}</p>
	<Button href={resolve('/')}>На головну</Button>
</div>
