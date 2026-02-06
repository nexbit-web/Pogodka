// lib/upstash.ts
export const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!;
export const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

export async function redisGet(key: string) {
  const url = `${UPSTASH_REDIS_REST_URL}/get/${key}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
  });
  const json = await res.json();
  if (json.result) {
    console.log(`[Redis GET] Кэш найден для ключа "${key}"`);
  } else {
    console.log(`[Redis GET] Кэша нет для ключа "${key}"`);
  }
  return json.result;
}

export async function redisSet(key: string, value: string, ttl: number) {
  const url = `${UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?ex=${ttl}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
  });
  if (res.ok) {
    console.log(
      `[Redis SET] Данные сохранены для ключа "${key}" на ${ttl} сек`,
    );
  } else {
    const text = await res.text();
    console.log(`[Redis SET] Ошибка при сохранении ключа "${key}": ${text}`);
  }
}

export async function redisIncrWithTTL(key: string, ttl: number) {
  // 1️⃣ Попробуем увеличить
  const incrRes = await fetch(`${UPSTASH_REDIS_REST_URL}/incr/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
  });
  const incrJson = await incrRes.json();
  const count = incrJson.result;

  // 2️⃣ Устанавливаем TTL только если это первый раз
  if (count === 1) {
    await fetch(`${UPSTASH_REDIS_REST_URL}/expire/${key}?seconds=${ttl}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
    });
  }

  return count;
}
