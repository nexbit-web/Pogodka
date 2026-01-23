"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";

interface BannedInfo {
  reason: string;
  banEnd: number; // timestamp в миллисекундах по Киеву
}

export default function BannedPage() {
  const router = useRouter();
  const [ban, setBan] = useState<BannedInfo | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    let interval: number;

    const fetchBan = async () => {
      try {
        const res = await fetch("/api/get-ban", { cache: "no-store" });
        const data: BannedInfo | null = await res.json();

        // Если бана нет — сразу редирект
        if (!data) {
          router.replace("/");
          return;
        }

        setBan(data);

        const updateTimer = async () => {
          // Текущее киевское время
          const nowKyiv = DateTime.now().setZone("Europe/Kyiv").toMillis();

          // Отсчет с +1 секунды, чтобы таймер был чуть больше
          const remaining = Math.max(
            Math.floor((data.banEnd - nowKyiv) / 1000) + 3,
            0,
          );
          setSecondsLeft(remaining);

          // Когда таймер закончился, проверяем сервер
          if (remaining <= 0) {
            clearInterval(interval);

            try {
              const check = await fetch("/api/get-ban", { cache: "no-store" });
              const updatedBan: BannedInfo | null = await check.json();

              // Если бан уже удален на сервере — редирект
              if (!updatedBan) {
                router.replace("/");
                return;
              }

              // Если бан еще не удален, подождать секунду и проверить снова
              setTimeout(async () => {
                const retry = await fetch("/api/get-ban", {
                  cache: "no-store",
                });
                const retryBan: BannedInfo | null = await retry.json();
                if (!retryBan) router.replace("/");
              }, 1000);
            } catch {
              router.replace("/");
            }
          }
        };

        updateTimer();
        interval = window.setInterval(updateTimer, 1000);
      } catch (err) {
        console.error(err);
        router.replace("/"); // при любой ошибке редирект
      }
    };

    fetchBan();

    return () => clearInterval(interval);
  }, [router]);

  if (!ban) return <div className="text-center mt-20">Завантаження...</div>;

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="text-center mt-20">
      <h1 className="text-2xl font-bold mb-4">🚫 Ви тимчасово заблоковані</h1>
      <p className="mb-2">Причина: {ban.reason}</p>
      <p className="text-lg">
        Час до кінця бану:{" "}
        <b>{secondsLeft > 0 ? formatTime(secondsLeft) : "00:00:00"}</b>
      </p>
    </div>
  );
}
