"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BannedInfo {
  reason: string;
  banEnd: number;
}

export default function BannedPage() {
  const router = useRouter();
  const [ban, setBan] = useState<BannedInfo | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkBan = async () => {
      try {
        const res = await fetch("/api/get-ban", { cache: "no-store" });
        const data: BannedInfo | null = await res.json();

        // ❌ Если бана нет — сразу редирект
        if (!data) {
          router.replace("/");
          return;
        }

        setBan(data);

        const updateTimer = () => {
          const remaining = Math.max(
            Math.floor((data.banEnd - Date.now()) / 1000),
            0,
          );
          setSecondsLeft(remaining);

          if (remaining <= 0) {
            clearInterval(interval);
            router.replace("/"); // редирект точно сработает
          }
        };

        updateTimer();
        interval = setInterval(updateTimer, 1000);
      } catch (err) {
        console.error(err);
        router.replace("/"); // при любой ошибке редирект
      }
    };

    checkBan();

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
        <b>{secondsLeft > 0 ? formatTime(secondsLeft) : "0:00:00"}</b>
      </p>
    </div>
  );
}
