<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
</script>

<svelte:head>
	<title>Угода користувача — Pogodka</title>
	<meta name="description" content="Правила використання сайту Pogodka.org." />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<div class="mx-auto mb-4 w-full px-4 sm:w-[100%] sm:px-6 lg:w-[70%] lg:px-8">
	<div class="mt-4 mb-4 w-1">
		<a href={resolve('/')} class="hover:text-gray-500" aria-label="На головну">
			<ArrowLeft size={40} />
		</a>
	</div>

	<section aria-labelledby="user-agreement-title">
		<h2 id="user-agreement-title" class="mb-4 text-4xl font-bold">Угода користувача</h2>

		<p class="mb-2 text-gray-500">
			Останнє оновлення: <time datetime="2026-01-15">15 січня 2026 року</time>
		</p>

		<p class="text-gray-500">
			Ласкаво просимо на наш вебсайт
			<a href="https://pogodka.org" class="hover:underline">https://pogodka.org</a>
			(далі – «Сайт»). Використовуючи Сайт, ви погоджуєтесь з цією Угодою користувача. Якщо ви не погоджуєтесь
			з умовами, будь ласка, не використовуйте наш Сайт.
		</p>

		<section aria-labelledby="general-terms">
			<h3 id="general-terms" class="mt-6 mb-2 text-2xl font-semibold">1. Загальні положення</h3>
			<p class="text-gray-500">
				1.1. Ця Угода визначає правила використання Сайту та надання послуг прогнозу погоди для
				території України.
			</p>
			<p class="text-gray-500">
				1.2. Сайт належить
				<a href="https://pogodka.org" class="hover:underline">https://pogodka.org</a>, контактний
				email:
				<a href="mailto:pogodkacontact@gmail.com?subject=Запит%20з%20сайту" class="hover:underline"
					>pogodkacontact@gmail.com</a
				>
			</p>
		</section>

		<section aria-labelledby="site-usage">
			<h3 id="site-usage" class="mt-6 mb-2 text-2xl font-semibold">2. Використання Сайту</h3>
			<p class="text-gray-500">2.1. Ви погоджуєтесь використовувати Сайт лише в законних цілях.</p>
			<p class="text-gray-500">
				2.2. Забороняється будь-яке втручання в роботу Сайту, модифікації контенту або використання
				його з комерційною метою без письмового дозволу власника.
			</p>
			<p class="text-gray-500">
				2.3. Власник Сайту залишає за собою право змінювати, блокувати або видаляти будь-який
				контент без попередження.
			</p>
		</section>

		<section aria-labelledby="personal-data">
			<h3 id="personal-data" class="mt-6 mb-2 text-2xl font-semibold">3. Персональні дані</h3>
			<p class="text-gray-500">
				3.1. Використання Сайту може вимагати надання деяких персональних даних (наприклад, місце
				розташування для точного прогнозу).
			</p>
			<p class="text-gray-500">
				3.2. Всі персональні дані обробляються відповідно до Закону України «Про захист персональних
				даних».
			</p>
			<p class="text-gray-500">
				3.3. Ми не передаємо персональні дані третім особам без вашої згоди, за винятком випадків,
				передбачених законом.
			</p>
			<p class="text-gray-500">
				3.4. Ви маєте право запитати доступ до своїх даних, їх виправлення або видалення.
			</p>
		</section>

		<section aria-labelledby="liability">
			<h3 id="liability" class="mt-6 mb-2 text-2xl font-semibold">4. Відповідальність</h3>
			<p class="text-gray-500">
				4.1. Прогнози погоди надаються для ознайомлення і не гарантують 100% точності.
			</p>
			<p class="text-gray-500">
				4.2. Власник Сайту не несе відповідальності за будь-які наслідки, що виникли внаслідок
				використання інформації з Сайту.
			</p>
			<p class="text-gray-500">
				4.3. Ви несете відповідальність за дотримання чинного законодавства під час використання
				Сайту.
			</p>
		</section>

		<section aria-labelledby="intellectual-property">
			<h3 id="intellectual-property" class="mt-6 mb-2 text-2xl font-semibold">
				5. Інтелектуальна власність
			</h3>
			<p class="text-gray-500">
				5.1. Усі матеріали Сайту (тексти, зображення, дизайн, код) є власністю pogodka.org або
				ліцензовані для використання на Сайті.
			</p>
			<p class="text-gray-500">
				5.2. Будь-яке копіювання або публікація матеріалів без дозволу заборонені.
			</p>
		</section>

		<section aria-labelledby="agreement-changes">
			<h3 id="agreement-changes" class="mt-6 mb-2 text-2xl font-semibold">6. Зміни Угоди</h3>
			<p class="text-gray-500">
				6.1. Власник Сайту залишає за собою право змінювати цю Угоду в будь-який час.
			</p>
			<p class="text-gray-500">
				6.2. У разі зміни Угоди, оновлена версія буде опублікована на Сайті з новою датою оновлення.
			</p>
			<p class="text-gray-500">
				6.3. Подальше використання Сайту після внесення змін означає ваше погодження з новою версією
				Угоди.
			</p>
		</section>

		<section aria-labelledby="contact-info">
			<h3 id="contact-info" class="mt-6 mb-2 text-2xl font-semibold">7. Контактна інформація</h3>
			<ul class="text-gray-500">
				<li>
					Email:
					<a
						href="mailto:pogodkacontact@gmail.com?subject=Запит%20з%20сайту"
						class="hover:underline">pogodkacontact@gmail.com</a
					>
				</li>
			</ul>
		</section>
	</section>
</div>
