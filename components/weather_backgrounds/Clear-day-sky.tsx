"use client";

import { useEffect, useRef } from "react";

interface ClearDaySkyProps {
  width?: number;
  height?: number;
}

export const ClearDaySky: React.FC<ClearDaySkyProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ===== Розміри полотна =====
    let w = width || window.innerWidth;
    let h = height || window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const resize = () => {
      w = width || window.innerWidth;
      h = height || window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", resize);

    // ===== Перевірка слабкого пристрою =====
    const lowEnd = navigator.hardwareConcurrency <= 4 || (navigator as any).deviceMemory <= 2;

    // ===== FPS для слабких/сильних пристроїв =====
    const FPS = lowEnd ? 15 : 30;

    // ===== Розмір сонця =====
    const SUN_RADIUS = lowEnd ? Math.min(w,h) * 0.1 : Math.min(w,h) * 0.15;

    // ===== Функція для позиції сонця по часу =====
    const getSunPosition = () => {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60;
      const t = Math.min(Math.max((hours - 6) / 12, 0), 1); // 6:00 - 18:00
      const x = 0.15 * w + 0.7 * w * t; // відступи 15% зліва і справа
      const y = 0.15 * h - Math.sin(t * Math.PI) * 0.05 * h; // легка дуга
      return { x, y };
    };

    // ===== Малюємо сонце =====
    const drawSun = () => {
      const sunPos = getSunPosition();

      // Основне свічення сонця
      const grad = ctx.createRadialGradient(
        sunPos.x,
        sunPos.y,
        0,
        sunPos.x,
        sunPos.y,
        SUN_RADIUS
      );
      grad.addColorStop(0, "rgba(255,255,220,1)");
      grad.addColorStop(0.3, "rgba(255,255,190,0.85)");
      grad.addColorStop(1, "rgba(255,255,180,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sunPos.x, sunPos.y, SUN_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // М'який блік сонця
      const flare = ctx.createRadialGradient(
        sunPos.x + SUN_RADIUS * 0.6,
        sunPos.y - SUN_RADIUS * 0.4,
        0,
        sunPos.x + SUN_RADIUS * 0.6,
        sunPos.y - SUN_RADIUS * 0.4,
        SUN_RADIUS * 1.5
      );
      flare.addColorStop(0, "rgba(255,255,220,0.35)");
      flare.addColorStop(1, "rgba(255,255,220,0)");
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(sunPos.x + SUN_RADIUS * 0.6, sunPos.y - SUN_RADIUS * 0.4, SUN_RADIUS * 1.5, 0, Math.PI * 2);
      ctx.fill();
    };

    // ===== Малюємо фон з градієнтом Apple-подібного неба =====
    const drawBackground = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#C6E2FF"); // верх світло-блакитний
      grad.addColorStop(0.5, "#99CCFF"); 
      grad.addColorStop(1, "#6EA7E2"); // низ більш насичений
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    };

    // ===== Основний цикл анімації =====
    let last = 0;
    const loop = (time: number) => {
      if (time - last < 1000 / FPS) {
        requestAnimationFrame(loop);
        return;
      }
      last = time;
      drawBackground();
      drawSun();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => window.removeEventListener("resize", resize);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
      }}
    />
  );
};
