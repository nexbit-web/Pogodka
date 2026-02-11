import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
export default function WeatherPage({}) {
  return (
    <div className="mx-auto w-full sm:w-[100%] lg:w-[70%] px-4 sm:px-6 lg:px-8 mb-4">
      <div className="w-1 mt-4 mb-4">
        <Link href="/" className="hover:text-gray-500">
          <ArrowLeft size={40} />
        </Link>
      </div>

      <section aria-labelledby="privacy-agreement-title">
        <h2 id="privacy-agreement-title" className="text-3xl font-bold mb-4">
          Угода про конфіденційність
        </h2>

        <p className="mb-2 text-gray-500">
          Останнє оновлення:{" "}
          <time dateTime="2026-01-15">15 січня 2026 року</time>
        </p>

        <p className="text-gray-500">
          Ласкаво просимо на вебсайт{" "}
          <a href="https://pogodka.org" className=" hover:underline">
            https://pogodka.org
          </a>{" "}
          (далі – «Сайт»). Використовуючи Сайт, ви погоджуєтесь із цією Угодою
          про конфіденційність. Якщо ви не погоджуєтесь з умовами, будь ласка,
          не використовуйте Сайт.
        </p>

        <section aria-labelledby="general-terms">
          <h3 id="general-terms" className="text-2xl font-semibold mt-6 mb-2">
            1. Загальні положення
          </h3>
          <p className="text-gray-500">
            1.1. Ця Угода регулює порядок збору, використання та захисту
            інформації про користувачів Сайту.
          </p>
          <p className="text-gray-500">
            1.2. Власником Сайту є, e-mail:{" "}
            <a
              href="mailto:pogodkacontact@gmail.com?subject=Запит%20з%20сайту"
              className=" hover:underline"
            >
              pogodkacontact@gmail.com
            </a>
          </p>
        </section>

        <section aria-labelledby="data-collection">
          <h3 id="data-collection" className="text-2xl font-semibold mt-6 mb-2">
            2. Збір інформації
          </h3>
          <p className="text-gray-500">
            2.1. Під час користування Сайтом можуть збиратися наступні дані:
          </p>
          <ul className="list-disc list-inside mb-4 text-gray-500">
            <li>файли cookie;</li>
            <li>IP-адреса користувача;</li>
            <li>параметри та налаштування браузера;</li>
            <li>
              анонімні дані про використання Сайту (наприклад, відвідувані
              сторінки).
            </li>
          </ul>
          <p className="text-gray-500">2.2. Ці дані використовуються для:</p>
          <ul className="list-disc list-inside mb-4 text-gray-500">
            <li>показу прогнозу погоди;</li>
            <li>покращення роботи Сайту та функціоналу;</li>
            <li>статистики відвідуваності;</li>
            <li>персоналізації контенту та реклами (включно з Google Ads).</li>
          </ul>
        </section>

        <section aria-labelledby="data-use">
          <h3 id="data-use" className="text-2xl font-semibold mt-6 mb-2">
            3. Використання та передача даних
          </h3>
          <p className="text-gray-500">
            3.1. Зібрані дані можуть передаватися третім особам у знеособленому
            вигляді (без можливості ідентифікації конкретного користувача).
          </p>
          <p className="text-gray-500">
            3.2. Це може включати рекламні мережі, аналітичні сервіси та інші
            сервіси для статистики.
          </p>
          <p className="text-gray-500">
            3.3. Використання Сайту означає згоду користувача на таку обробку та
            передачу даних.
          </p>
        </section>

        <section aria-labelledby="cookies">
          <h3 id="cookies" className="text-2xl font-semibold mt-6 mb-2">
            4. Керування файлами cookie
          </h3>
          <p className="text-gray-500">
            4.1. Користувач може відмовитися від cookie через налаштування
            браузера, проте деякі функції Сайту можуть працювати обмежено.
          </p>
          <p className="text-gray-500">
            4.2. Інструкції для популярних браузерів доступні на сторінках
            Microsoft Edge, Google Chrome, Safari, Firefox, Opera.
          </p>
        </section>

        <section aria-labelledby="user-rights">
          <h3 id="user-rights" className="text-2xl font-semibold mt-6 mb-2">
            5. Права користувача
          </h3>
          <p className="text-gray-500">5.1. Користувач має право:</p>
          <ul className="list-disc list-inside mb-4 text-gray-500">
            <li>доступу до своїх даних;</li>
            <li>виправлення або видалення персональних даних;</li>
            <li>відмови від обробки даних для маркетингових цілей.</li>
          </ul>
          <p className="text-gray-500">
            5.2. Для реалізації цих прав користувач може звернутись на email:{" "} 
            <a
              href="mailto:pogodkacontact@gmail.com?subject=Запит%20з%20сайту"
              className=" hover:underline"
            >
              pogodkacontact@gmail.com
            </a>
          </p>
        </section>

        <section aria-labelledby="data-protection">
          <h3 id="data-protection" className="text-2xl font-semibold mt-6 mb-2">
            6. Захист даних
          </h3>
          <p className="text-gray-500">
            6.1. Всі дані зберігаються на захищених серверах з обмеженим
            доступом.
          </p>
          <p className="text-gray-500">
            6.2. Власником застосовуються технічні та організаційні заходи для
            захисту даних користувачів.
          </p>
        </section>

        <section aria-labelledby="complaints">
          <h3 id="complaints" className="text-2xl font-semibold mt-6 mb-2">
            7. Скарги та звернення
          </h3>
          <p className="text-gray-500">
            7.1. У випадку порушення умов цієї Угоди користувач має право
            звертатися до контролюючих, правоохоронних або судових органів.
          </p>
        </section>

        <section aria-labelledby="agreement-changes">
          <h3
            id="agreement-changes"
            className="text-2xl font-semibold mt-6 mb-2"
          >
            8. Зміни Угоди
          </h3>
          <p className="text-gray-500">
            8.1. Власник Сайту залишає за собою право змінювати цю Угоду у
            будь-який час.
          </p>
          <p className="text-gray-500">
            8.2. Оновлена версія Угоди публікується на Сайті з новою датою
            оновлення.
          </p>
          <p className="text-gray-500">
            8.3. Подальше використання Сайту після внесення змін означає згоду
            Користувача з новою версією Угоди.
          </p>
        </section>
      </section>
    </div>
  );
}
