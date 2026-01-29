"use client";

import AnimatedTimer from "@/components/shared/AnimatedTimer";
import { useEffect, useRef, useState } from "react";

type BanApiResponse = false | { banned: true; banEnd: number };

export default function BannedPage() {
  const [banEnd, setBanEnd] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  const hasFetched = useRef(false);

  const checkBan = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/get-ban", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BanApiResponse = await res.json();

      if (data === false) {
        window.location.href = "/";
        return;
      }

      const remainingMs = data.banEnd - Date.now();
      const remainingSec = Math.max(Math.ceil(remainingMs / 1000), 0);

      if (remainingSec <= 0) {
        window.location.href = "/";
        return;
      }

      setBanEnd(data.banEnd);
      setSecondsLeft(remainingSec + 4); // старт з +4 секунд
      // 🔹 Сохраняем причину
      setReason(
        (data as { banned: true; banEnd: number; reason?: string }).reason ||
          "Без причини",
      );
      setLoading(false);
    } catch (err) {
      console.error("Помилка перевірки бана:", err);
      setError("Не вдалося перевірити статус блокування.");
      setLoading(false);
    }
  };

  // Первинна перевірка
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    checkBan();
  }, []);

  // Таймер
  useEffect(() => {
    if (!banEnd || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLoading(true); // показуємо завантаження
          checkBan(); // перевірка бану після закінчення таймера
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [banEnd]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="text-center mt-20 text-lg text-gray-500">
        Перевірка статусу...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-20 text-lg text-red-600">
        {error}
        <div className="mt-3 text-base text-gray-600">
          Спробуйте оновити сторінку пізніше.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center mt-20 px-4 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-red-600">
        🚫 Ви заблоковані
      </h1>

      {reason && (
        <p className="text-lg text-gray-700 mb-4">
          Причина блокування: {reason}
        </p>
      )}

      <div className="flex gap-2 text-2xl font-semibold">
        Залишилось:
        <span>
          <AnimatedTimer seconds={secondsLeft} />
        </span>
      </div>
    </div>
  );
}
