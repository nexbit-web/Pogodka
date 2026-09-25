# Pogodka — SvelteKit

Порт застосунку Pogodka (прогноз погоди по містах і селах України) з Next.js 16 App Router
на **SvelteKit 2 + Svelte 5 (runes)**.

Стек: SvelteKit 2, Svelte 5, Tailwind CSS 4, shadcn-svelte (bits-ui), Prisma 7 + Neon,
Upstash Redis (REST), Open-Meteo, Luxon, adapter-vercel.

## Запуск

```bash
npm install          # postinstall сам виконає prisma generate
cp .env.example .env # заповніть значення
npm run dev
```

Інші команди:

| Команда               | Що робить                                    |
| --------------------- | -------------------------------------------- |
| `npm run build`       | Продакшн-збірка                              |
| `npm run preview`     | Локальний перегляд збірки                    |
| `npm run check`       | Перевірка типів (`svelte-check`)             |
| `npm run lint`        | Prettier + ESLint                            |
| `npm run format`      | Автоформатування                             |
| `npm run seed:cities` | Заливка `scripts/cities.json` у таблицю City |

> **Windows:** `npm run build` компілюється успішно, але `adapter-vercel` на останньому кроці
> створює символьне посилання, що потребує Developer Mode або прав адміністратора. Без них
> збірка падає з `EPERM: symlink`. На Vercel (Linux) це не відтворюється.

## Змінні оточення

Усі читаються через `$env/dynamic/private`, тобто на рантаймі, і ніколи не потрапляють у клієнт.

- `DATABASE_URL` — Postgres (Neon). Обов'язково.
- `TG_BOT_TOKEN`, `TG_SUPPORT_CHAT_ID` — форма техпідтримки надсилає звернення в Telegram.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — кеш погоди. Якщо не задані, сайт
  працює без кешу (кожен запит іде в Open-Meteo).
- `ANTI_BOT_SECRET` — сіль для HMAC у `src/lib/server/fingerprint.ts`.

## Структура

```
src/
  app.css                      глобальні стилі + токени теми (порт globals.css)
  app.html                     favicon, robots, lang="uk"
  lib/
    config.ts                  SITE_URL, назва сайту, OG-картинка
    types.ts                   типи відповіді Open-Meteo та API
    weather.ts                 розбір погоди, тексти й id іконок (спільно клієнт/сервер)
    version.ts                 версія з package.json для футера
    supportSchema.ts           Yup-схема форми підтримки (клієнт + сервер)
    server/                    лише сервер — Vite не пустить це в клієнтський бандл
      prisma.ts                Prisma + Neon adapter, синглтон
      upstash.ts               Redis через REST
      weather.ts               getCityWeather / findCity
      support.ts               відправка в Telegram
      fingerprint.ts           HMAC від IP
    components/
      ui/                      shadcn-svelte (bits-ui)
      shared/                  компоненти застосунку
  routes/
    +layout.svelte             тема, тости, топлоадер, шапка
    +page.server.ts|.svelte    головна (Київ)
    +error.svelte              404 та інші помилки
    pohoda/[city]/             сторінка міста + JSON-LD
    agreement/, privacypolicy/, support/
    api/cities/search/         пошук міст
    api/pogoda/                публічний JSON погоди
    api/sitemap.xml/, api/sitemap/[index]/
```

## Що змінилось відносно Next.js-версії

**Сторінки більше не ходять по HTTP самі до себе.** У Next.js `app/page.tsx` і
`app/pohoda/[city]/page.tsx` робили `fetch('https://www.pogodka.org/api/pogoda?...')` — тобто
навіть локальний дев і прев'ю-деплої тягнули дані з продакшену, а кожен рендер коштував
зайвого мережевого стрибка. Тут `load` викликає `getCityWeather()` напряму. Ендпоінт
`/api/pogoda` лишився для зовнішніх споживачів.

**Віджети рендеряться на сервері.** У Next.js половина блоків була
`dynamic(..., { ssr: false })` зі скелетонами. У SvelteKit вони SSR-яться разом зі сторінкою:
немає стрибка лейауту й весь контент видно пошуковикам.

**Форма підтримки працює без JavaScript.** Замість `onSubmit` + `fetch` — form action
з `use:enhance`. Валідація Yup спільна: `src/lib/supportSchema.ts` використовується і на
клієнті (для UX), і на сервері (як єдина довірена перевірка).

**404 замість порожньої сторінки.** Невідоме місто повертає справжній 404 з `+error.svelte`,
а не 200 з текстом помилки.

Заміни бібліотек: `next-themes` → `mode-watcher`, `react-hot-toast` → `svelte-sonner`,
`nextjs-toploader` → власний `TopLoader.svelte`, `lucide-react` → `@lucide/svelte`
(бренд-іконки з lucide прибрані, тому YouTube у футері — інлайновий SVG),
`use-debounce` → дебаунс у `$effect` шапки.

## Що не портувалось

- `components/shared/WeatherAnalytics.tsx` — у Next.js-версії був закоментований у
  `WeatherLayout`, тобто мертвий код. Якщо трекінг потрібен, його легко відтворити на
  `$app/state` + `navigator.sendBeacon`.
- `lib/generated/**` — залишки старого генератора Prisma; клієнт генерується в
  `node_modules/@prisma/client`.
- `next.config.ts → images.remotePatterns` для `cdn.weatherapi.com` — стосувалось `next/image`,
  який тут не використовується. Заголовок кешу для `/icons.svg` перенесено у `vercel.json`.
- Посилання `/ads` у футері лишилось, як і було: самої сторінки немає ні тут, ні в
  Next.js-версії.

## Дані міст

Увага: `scripts/cities.json`, який читає `npm run seed:cities`, **порожній** — так само було
і в Next.js-версії. Реальні дані лежать у `cities.json` у корені проєкту: 443 записи, але
**без поля `slug`**, якого вимагають і схема Prisma, і сам сид. Тобто зараз сид не запрацює
без підготовки даних. Чинна база вже заповнена (в ній десятки тисяч міст), тому на роботу
сайту це не впливає — але якщо доведеться сідити з нуля, спершу треба згенерувати слаги
й покласти масив у `scripts/cities.json`.

## Версії

Prisma закріплена на `7.2.0` — тій самій, на якій працює Next.js-версія. У 7.10 CLI
перебудували під Prisma Developer Platform і команди `prisma generate` там уже немає.
