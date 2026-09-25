<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	const EMAIL = 'pogodkacontact@gmail.com';
	const MAILTO = `mailto:${EMAIL}?subject=Запит%20з%20сайту`;
</script>

<svelte:head>
	<title>Політика конфіденційності — Pogodka</title>
	<meta
		name="description"
		content="Які дані збирає Pogodka.org, як працюють файли cookie та реклама Google AdSense і як від неї відмовитися."
	/>
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<!--
	Розділ про рекламу містить усе, що Google вимагає від видавців AdSense:
	cookie Google і сторонніх постачальників, персоналізовану рекламу й посилання для відмови.
-->
<div class="mx-auto mb-4 w-full px-4 sm:w-[100%] sm:px-6 lg:w-[70%] lg:px-8">
	<div class="mt-4 mb-4 w-1">
		<a href={resolve('/')} class="hover:text-gray-500" aria-label="На головну">
			<ArrowLeft size={40} />
		</a>
	</div>

	<article aria-labelledby="privacy-title">
		<h1 id="privacy-title" class="mb-4 text-3xl font-bold">Політика конфіденційності</h1>

		<p class="mb-2 text-gray-500">
			Останнє оновлення: <time datetime="2026-09-25">25 вересня 2026 року</time>
		</p>

		<p class="text-gray-500">
			Ця Політика пояснює, які дані збирає вебсайт
			<a href="https://www.pogodka.org" class="hover:underline">https://www.pogodka.org</a>
			(далі — «Сайт»), навіщо вони потрібні, кому передаються і як ви можете керувати ними.
		</p>

		<section aria-labelledby="general-terms">
			<h2 id="general-terms" class="mt-6 mb-2 text-2xl font-semibold">1. Загальні положення</h2>
			<p class="text-gray-500">
				1.1. Сайт — безкоштовний сервіс прогнозу погоди для населених пунктів України. Його
				адмініструє команда Pogodka (далі — «Власник»).
			</p>
			<p class="text-gray-500">
				1.2. З питань щодо персональних даних пишіть на
				<a href={MAILTO} class="hover:underline">{EMAIL}</a>.
			</p>
			<p class="text-gray-500">
				1.3. Для перегляду прогнозу реєстрація не потрібна: Сайт не просить імені, телефону чи інших
				даних, за якими вас можна впізнати.
			</p>
		</section>

		<section aria-labelledby="data-collection">
			<h2 id="data-collection" class="mt-6 mb-2 text-2xl font-semibold">2. Які дані збираються</h2>
			<ul class="mb-4 list-inside list-disc text-gray-500">
				<li>
					технічні дані, які браузер надсилає з кожним запитом: IP-адреса, тип і версія браузера,
					операційна система, мова, адреса сторінки;
				</li>
				<li>
					файли cookie та подібні технології — ними користуються рекламні й аналітичні сервіси
					(розділ 3);
				</li>
				<li>
					вибрана тема оформлення (світла чи темна) — зберігається лише у вашому браузері
					(localStorage) і на сервер не надсилається;
				</li>
				<li>
					дані з форми
					<a href={resolve('/support')} class="hover:underline">техпідтримки</a> — email, тема та текст
					звернення, якщо ви самі їх надіслали.
				</li>
			</ul>
			<p class="text-gray-500">2.1. Ці дані використовуються для того, щоб:</p>
			<ul class="mb-4 list-inside list-disc text-gray-500">
				<li>показати прогноз погоди для вибраного населеного пункту;</li>
				<li>забезпечити стабільну й безпечну роботу Сайту, захистити його від зловживань;</li>
				<li>вести знеособлену статистику відвідуваності та покращувати Сайт;</li>
				<li>показувати рекламу, завдяки якій Сайт залишається безкоштовним;</li>
				<li>відповісти на ваше звернення до техпідтримки.</li>
			</ul>
		</section>

		<section aria-labelledby="advertising">
			<h2 id="advertising" class="mt-6 mb-2 text-2xl font-semibold">3. Реклама Google AdSense</h2>
			<p class="text-gray-500">
				3.1. На Сайті показується реклама Google AdSense. Сторонні постачальники, зокрема Google,
				використовують файли cookie, щоб показувати рекламу на основі ваших попередніх відвідувань
				цього Сайту та інших сайтів.
			</p>
			<p class="text-gray-500">
				3.2. Рекламні файли cookie дозволяють Google і його партнерам показувати вам рекламу з
				урахуванням відвідувань цього Сайту та інших сайтів в інтернеті. Докладніше — у статті
				<a
					href="https://policies.google.com/technologies/partner-sites?hl=uk"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary hover:underline"
					>«Як Google використовує дані із сайтів і додатків партнерів»</a
				>.
			</p>
			<p class="text-gray-500">
				3.3. Ви можете вимкнути персоналізовану рекламу в
				<a
					href="https://adssettings.google.com/"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary hover:underline">Налаштуваннях реклами Google</a
				>. Від cookie інших постачальників персоналізованої реклами можна відмовитися на сайтах
				<a
					href="https://www.aboutads.info/choices/"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary hover:underline">aboutads.info</a
				>
				та
				<a
					href="https://www.youronlinechoices.eu/"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary hover:underline">youronlinechoices.eu</a
				>.
			</p>
			<p class="text-gray-500">
				3.4. Якщо ви відмовитеся від персоналізації, реклама не зникне, але стане менш відповідною
				вашим інтересам.
			</p>
			<p class="text-gray-500">
				3.5. Відвідувачам із країн Європейської економічної зони, Великої Британії та Швейцарії Сайт
				показує вікно згоди, сертифіковане Google відповідно до стандарту IAB TCF. У ньому
				перелічено всіх рекламних партнерів і цілі обробки даних. Без вашої згоди показується лише
				неперсоналізована реклама. Змінити або відкликати згоду можна будь-коли кнопкою налаштувань
				конфіденційності внизу сторінки.
			</p>
		</section>

		<section aria-labelledby="providers">
			<h2 id="providers" class="mt-6 mb-2 text-2xl font-semibold">4. Інші сервіси</h2>
			<ul class="mb-4 list-inside list-disc text-gray-500">
				<li>
					<a
						href="https://open-meteo.com/"
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary hover:underline">Open-Meteo</a
					> — джерело даних прогнозу. Сервер Сайту передає йому лише координати населеного пункту, а не
					дані про вас;
				</li>
				<li>
					Vercel — хостинг Сайту. Його сервери обробляють запити й короткий час зберігають технічні
					журнали, зокрема IP-адреси;
				</li>
				<li>
					Google Fonts — шрифт Inter завантажується із серверів Google, тож вони бачать вашу
					IP-адресу;
				</li>
				<li>Telegram — через нього звернення з форми техпідтримки доходять до команди Сайту.</li>
			</ul>
			<p class="text-gray-500">
				4.1. Власник не продає персональні дані і не передає їх третім особам, окрім сервісів,
				перелічених у цій Політиці, та випадків, передбачених законом.
			</p>
		</section>

		<section aria-labelledby="cookies">
			<h2 id="cookies" class="mt-6 mb-2 text-2xl font-semibold">5. Керування файлами cookie</h2>
			<p class="text-gray-500">
				5.1. Ви можете заборонити або видалити файли cookie в налаштуваннях браузера: Google Chrome,
				Safari, Mozilla Firefox, Microsoft Edge, Opera. Прогноз погоди працюватиме й без них, але
				реклама стане неперсоналізованою.
			</p>
		</section>

		<section aria-labelledby="children">
			<h2 id="children" class="mt-6 mb-2 text-2xl font-semibold">6. Діти</h2>
			<p class="text-gray-500">
				6.1. Сайт не призначений спеціально для дітей і свідомо не збирає даних осіб молодше 16
				років. Якщо ви вважаєте, що дитина надіслала нам свої дані, напишіть на
				<a href={MAILTO} class="hover:underline">{EMAIL}</a> — ми їх видалимо.
			</p>
		</section>

		<section aria-labelledby="user-rights">
			<h2 id="user-rights" class="mt-6 mb-2 text-2xl font-semibold">7. Ваші права</h2>
			<p class="text-gray-500">7.1. Ви маєте право:</p>
			<ul class="mb-4 list-inside list-disc text-gray-500">
				<li>дізнатися, які ваші дані обробляються;</li>
				<li>виправити або видалити їх;</li>
				<li>відкликати згоду та заперечити проти обробки для рекламних цілей;</li>
				<li>подати скаргу до органу із захисту персональних даних своєї країни.</li>
			</ul>
			<p class="text-gray-500">
				7.2. Щоб скористатися цими правами, напишіть на
				<a href={MAILTO} class="hover:underline">{EMAIL}</a>. Ми відповімо протягом 30 днів.
			</p>
		</section>

		<section aria-labelledby="data-protection">
			<h2 id="data-protection" class="mt-6 mb-2 text-2xl font-semibold">8. Захист і зберігання</h2>
			<p class="text-gray-500">
				8.1. Сайт працює лише через захищене зʼєднання HTTPS. Звернення до техпідтримки зберігаються
				не довше, ніж потрібно, щоб на них відповісти.
			</p>
		</section>

		<section aria-labelledby="policy-changes">
			<h2 id="policy-changes" class="mt-6 mb-2 text-2xl font-semibold">9. Зміни Політики</h2>
			<p class="text-gray-500">
				9.1. Власник може оновлювати цю Політику. Нова версія публікується на цій сторінці з новою
				датою оновлення.
			</p>
		</section>
	</article>
</div>
