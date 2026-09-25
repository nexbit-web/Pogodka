<script lang="ts">
	import { untrack } from 'svelte';
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Spinner } from '$lib/components/ui/spinner';
	import { cn } from '$lib/utils';
	import { emptyErrors, validateSupport, type SupportErrors } from '$lib/supportSchema';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	// Значення з невдалої відправки потрібні лише при першому рендері (варіант без JS)
	const initial = untrack(() => form?.values);

	let email = $state(initial?.email ?? '');
	let subject = $state(initial?.subject ?? '');
	let message = $state(initial?.message ?? '');
	let loading = $state(false);

	let errors = $state<SupportErrors>({ ...emptyErrors });
	let isValid = $state(false);
	let touched = $state({ email: false, subject: false, message: false });

	// Валідація на кожну зміну полів
	$effect(() => {
		const values = { email, subject, message };
		let cancelled = false;

		validateSupport(values).then((result) => {
			if (cancelled) return;
			errors = result.errors;
			isValid = result.valid;
		});

		return () => {
			cancelled = true;
		};
	});
</script>

<svelte:head>
	<title>Техпідтримка — Pogodka</title>
	<meta name="description" content="Зв’яжіться зі службою підтримки Pogodka." />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<form
	method="POST"
	use:enhance={() => {
		loading = true;

		return async ({ result }) => {
			loading = false;

			if (result.type === 'success') {
				email = '';
				subject = '';
				message = '';
				touched = { email: false, subject: false, message: false };
				errors = { ...emptyErrors };
				toast.success('Готово! Повідомлення надіслано.');
				await goto(resolve('/'), { replaceState: true });
				return;
			}

			if (result.type === 'failure') {
				toast.error(String(result.data?.message ?? 'Помилка відправки.'));
				return;
			}

			await applyAction(result);
		};
	}}
>
	<Field.Group class="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
		<!-- Поле Email -->
		<Field.Field
			class={cn(
				'w-full max-w-md transition-colors',
				touched.email && errors.email
					? 'border-red-500 focus:border-red-500'
					: 'border-gray-300 focus:border-primary'
			)}
		>
			<Field.Label for="support-email">Email</Field.Label>
			<Input
				id="support-email"
				name="email"
				type="email"
				placeholder="Email"
				bind:value={email}
				onblur={() => (touched.email = true)}
				aria-invalid={Boolean(errors.email) && touched.email}
				class="transition-colors"
			/>
			<Field.Description class="mt-1 text-sm">
				{touched.email && errors.email
					? errors.email
					: 'Введіть email, куди нам надіслати відповідь.'}
			</Field.Description>
		</Field.Field>

		<!-- Поле Тема повідомлення -->
		<Field.Field
			class={cn(
				'w-full max-w-md transition-colors',
				touched.subject && errors.subject
					? 'border-red-500 focus:border-red-500'
					: 'border-gray-300 focus:border-primary'
			)}
		>
			<Field.Label for="support-subject">Тема повідомлення</Field.Label>
			<Input
				id="support-subject"
				name="subject"
				type="text"
				placeholder="Тема"
				bind:value={subject}
				onblur={() => (touched.subject = true)}
				aria-invalid={Boolean(errors.subject) && touched.subject}
				class="transition-colors"
			/>
			<Field.Description class="mt-1 text-sm">
				{touched.subject && errors.subject ? errors.subject : 'Введіть тему повідомлення.'}
			</Field.Description>
		</Field.Field>

		<!-- Поле Повідомлення -->
		<Field.Field
			class={cn(
				'w-full max-w-md transition-colors',
				touched.message && errors.message
					? 'border-red-500 focus:border-red-500'
					: 'border-gray-300 focus:border-primary'
			)}
		>
			<Field.Label for="support-message">Ваше питання</Field.Label>
			<Textarea
				id="support-message"
				name="message"
				placeholder="Введіть тут своє повідомлення."
				bind:value={message}
				onblur={() => (touched.message = true)}
				aria-invalid={Boolean(errors.message) && touched.message}
				class="transition-colors"
			/>
			<Field.Description class="mt-1 text-sm">
				{touched.message && errors.message ? errors.message : 'Введіть тут своє питання.'}
			</Field.Description>
		</Field.Field>

		<!-- Кнопка відправки -->
		<Field.Field class="w-full max-w-md">
			<Button type="submit" class="w-full" disabled={!isValid || loading}>
				{#if loading}
					<Spinner class="size-6" /> Відправка...
				{:else}
					Відправити
				{/if}
			</Button>
		</Field.Field>
	</Field.Group>
</form>
