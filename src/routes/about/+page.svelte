<script lang="ts">
	import { resolve } from '$app/paths';
	import Footer from '$lib/components/shared/Footer.svelte';
	import Seo from '$lib/components/shared/Seo.svelte';
	import { SITE_NAME } from '$lib/config';
	import { absoluteUrl, breadcrumbLd, graph, organizationLd } from '$lib/seo';

	const TITLE = `Про нас — ${SITE_NAME}`;
	const DESCRIPTION =
		'Pogodka — безкоштовний прогноз погоди для кожного міста й села України: звідки дані, як часто оновлюються і як з нами звʼязатися.';

	const jsonLd = graph(
		organizationLd(),
		{
			'@type': 'AboutPage',
			'@id': `${absoluteUrl('/about')}#webpage`,
			url: absoluteUrl('/about'),
			name: TITLE,
			description: DESCRIPTION,
			inLanguage: 'uk',
			about: { '@id': `${absoluteUrl('/')}/#organization` }
		},
		breadcrumbLd([
			{ name: 'Прогноз погоди', path: '/' },
			{ name: 'Про нас', path: '/about' }
		])
	);

	const FEATURES = [
		{
			title: 'Кожен населений пункт',
			text: 'Понад 24 тисячі міст, селищ і сіл України — кожен має власну сторінку з прогнозом саме для його координат.'
		},
		{
			title: 'Сім днів і кожна година',
			text: 'Температура і як вона відчувається, опади, вітер, тиск, вологість, ультрафіолет, схід і захід сонця.'
		},
		{
			title: 'Зрозумілою мовою',
			text: 'Короткий опис кожного дня: чи буде дощ, коли потеплішає і наскільки день відрізняється від учорашнього.'
		}
	];
</script>

<Seo title={TITLE} description={DESCRIPTION} path="/about" {jsonLd} />

<div class="mx-auto max-w-[980px] px-4 pt-8 sm:px-6 sm:pt-14">
	<h1
		class="max-w-[780px] text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] sm:text-[48px]"
	>
		Про Pogodka. <span class="text-tertiary">Прогноз погоди для кожного міста й села України.</span>
	</h1>

	<p class="mt-5 max-w-[680px] text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]">
		Pogodka — незалежний український сервіс прогнозу погоди. Ми робимо його простим і швидким: без
		реєстрації, без зайвих кроків, з телефона чи компʼютера.
	</p>

	<ul class="mt-10 grid gap-px overflow-hidden rounded-[18px] bg-separator sm:grid-cols-3">
		{#each FEATURES as feature (feature.title)}
			<li class="bg-muted p-5 sm:p-6">
				<h2 class="text-[17px] font-semibold tracking-[-0.01em]">{feature.title}</h2>
				<p class="mt-2 text-[15px] leading-relaxed text-muted-foreground">{feature.text}</p>
			</li>
		{/each}
	</ul>

	<div class="mt-12 grid gap-10 sm:mt-16 sm:grid-cols-2 sm:gap-x-12">
		<section aria-labelledby="about-data">
			<h2 id="about-data" class="text-[22px] font-semibold tracking-[-0.02em] sm:text-[24px]">
				Звідки дані.
			</h2>
			<p class="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
				Прогноз надає відкритий метеосервіс
				<a
					href="https://open-meteo.com/"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary hover:underline">Open-Meteo</a
				>. Він поєднує числові моделі провідних метеослужб і для кожної точки обирає найточнішу.
				Дані оновлюються щонайменше раз на дві години.
			</p>
		</section>

		<section aria-labelledby="about-free">
			<h2 id="about-free" class="text-[22px] font-semibold tracking-[-0.02em] sm:text-[24px]">
				Чому безкоштовно.
			</h2>
			<p class="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
				Сайт утримується завдяки рекламі, яка завжди відокремлена від прогнозу. Які дані при цьому
				використовуються і як від персоналізації відмовитися, описано в
				<a href={resolve('/privacypolicy')} class="text-primary hover:underline"
					>Політиці конфіденційності</a
				>.
			</p>
		</section>

		<section aria-labelledby="about-contact">
			<h2 id="about-contact" class="text-[22px] font-semibold tracking-[-0.02em] sm:text-[24px]">
				Звʼязатися з нами.
			</h2>
			<p class="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
				Помітили помилку в прогнозі чи не знайшли свій населений пункт? Напишіть на
				<a href="mailto:pogodkacontact@gmail.com" class="text-primary hover:underline"
					>pogodkacontact@gmail.com</a
				>
				або через
				<a href={resolve('/support')} class="text-primary hover:underline">форму техпідтримки</a>.
			</p>
		</section>

		<section aria-labelledby="about-video">
			<h2 id="about-video" class="text-[22px] font-semibold tracking-[-0.02em] sm:text-[24px]">
				Погода у відео.
			</h2>
			<p class="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
				Огляди погоди по Україні публікуємо на
				<a
					href="https://www.youtube.com/@Pogodka-UA"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary hover:underline">YouTube-каналі Pogodka</a
				>.
			</p>
		</section>
	</div>

	<p class="mt-12 sm:mt-16">
		<a
			href={resolve('/')}
			class="inline-flex h-11 items-center rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
		>
			Дивитися прогноз
		</a>
	</p>
</div>

<Footer breadcrumb="Про нас" />
