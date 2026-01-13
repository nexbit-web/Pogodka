"use client";

import { useEffect, useRef } from "react";

interface CloudyDaySkyProps {
  width?: number;
  height?: number;
}

export const CloudyDaySky: React.FC<CloudyDaySkyProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ===== Ініціалізація розмірів полотна =====
    let w = width || window.innerWidth;
    let h = height || window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // ===== Функція ресайзу =====
    const resize = () => {
      w = width || window.innerWidth;
      h = height || window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", resize);

    // ===== Визначення слабкого пристрою =====
    const lowEnd = navigator.hardwareConcurrency <= 4 || (navigator as any).deviceMemory <= 2;

    // ===== FPS динамічно залежно від потужності пристрою =====
    const FPS = lowEnd ? 15 : 30;

    // ===== СОНЦЕ =====
    const sun = {
      x: 0.1,
      y: 0.25,
      radius: w <= 400 ? 60 : 120, // зменшене для малих екранів
    };

    // ===== Оновлення позиції сонця в залежності від часу =====
    const updateSunPosition = () => {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60;

      // Горизонтальна позиція від 0.1 до 0.9
      const minX = 0.1;
      const maxX = 0.9;
      sun.x = minX + ((hours - 6) / 12) * (maxX - minX);
      sun.x = Math.max(minX, Math.min(maxX, sun.x));

      // Вертикальна позиція – синусоїда, обмежена зверху і знизу
      const minY = 0.15;
      const maxY = 0.45;
      const midY = (minY + maxY) / 2;
      const amplitude = (maxY - minY) / 2;
      sun.y = midY - amplitude * Math.sin(Math.PI * ((sun.x - minX) / (maxX - minX)));
    };

    // ===== Малювання сонця =====
    const drawSun = () => {
      const grad = ctx.createRadialGradient(
        sun.x * w,
        sun.y * h,
        0,
        sun.x * w,
        sun.y * h,
        sun.radius
      );
      grad.addColorStop(0, "rgba(255,255,200,0.8)");
      grad.addColorStop(0.5, "rgba(255,255,180,0.5)");
      grad.addColorStop(1, "rgba(255,255,180,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sun.x * w, sun.y * h, sun.radius, 0, Math.PI * 2);
      ctx.fill();
    };

    // ===== ОБЛАКА =====
    const speedFactor = w <= 768 ? 1.6 : w <= 1200 ? 1.2 : 1;
    const cloudCount = lowEnd ? 3 : 6; // менше хмар для слабких пристроїв
    const clouds: {
      x: number;
      y: number;
      width: number;
      height: number;
      baseWidth: number;
      baseHeight: number;
      speed: number;
      alpha: number;
      swayAngle: number;
      swayAmount: number;
    }[] = [];

    // ===== Генерація хмар =====
    for (let i = 0; i < cloudCount; i++) {
      const baseWidth = 100 + Math.random() * 150;
      const baseHeight = 30 + Math.random() * 40;
      clouds.push({
        x: Math.random(),
        y: Math.random() * 0.5,
        width: baseWidth,
        height: baseHeight,
        baseWidth,
        baseHeight,
        speed: 0.0002 * speedFactor,
        alpha: 0.15 + Math.random() * 0.1,
        swayAngle: Math.random() * Math.PI * 2,
        swayAmount: 0.03 + Math.random() * 0.02,
      });
    }

    // ===== Малювання хмар =====
    const drawClouds = () => {
      clouds.forEach((c) => {
        c.swayAngle += 0.0005;
        const wMod = c.baseWidth * (0.95 + c.swayAmount * Math.sin(c.swayAngle));
        const hMod = c.baseHeight * (0.95 + c.swayAmount * Math.sin(c.swayAngle * 1.1));
        const grad = ctx.createRadialGradient(c.x * w, c.y * h, wMod * 0.1, c.x * w, c.y * h, wMod);
        grad.addColorStop(0, `rgba(255,255,255,${c.alpha})`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(c.x * w, c.y * h, wMod, hMod, 0, 0, Math.PI * 2);
        ctx.fill();

        // Рух хмар зліва направо
        c.x -= c.speed;
        if (c.x < -0.4) c.x = 1.4;
      });
    };

    // ===== ФОН =====
    const drawBackground = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#7fa8c8"); // верхнє небо
      grad.addColorStop(1, "#acc9e0"); // нижнє небо
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    };

    // ===== ОСНОВНИЙ ЦИКЛ =====
    let lastTime = 0;
    const loop = (time: number) => {
      // Обмеження FPS
      if (time - lastTime < 1000 / FPS) {
        requestAnimationFrame(loop);
        return;
      }
      lastTime = time;

      drawBackground();  // малювання фону
      updateSunPosition(); // оновлення позиції сонця
      drawSun();          // малювання сонця
      drawClouds();       // малювання хмар

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => window.removeEventListener("resize", resize);
  }, [width, height]);

  // ===== Canvas =====
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        
      }}
    />
  );
};
