"use client";

import { useEffect, useRef } from "react";

interface FogSkyProps {
  width?: number;
  height?: number;
}

export const FogSky: React.FC<FogSkyProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const c = canvas as HTMLCanvasElement;
    const context = ctx as CanvasRenderingContext2D;

    // ===== Розміри полотна =====
    let w = width || window.innerWidth;
    let h = height || window.innerHeight;
    c.width = w;
    c.height = h;

    const resize = () => {
      w = width || window.innerWidth;
      h = height || window.innerHeight;
      c.width = w;
      c.height = h;
      fogLimit = h * 0.35;
      createFog();
    };
    window.addEventListener("resize", resize);

    // ===== Перевірка слабкого пристрою =====
    const lowEnd =
      navigator.hardwareConcurrency <= 4 ||
      (navigator as any).deviceMemory <= 2 ||
      window.innerWidth < 600;

    // ===== FPS =====
    const FPS = lowEnd ? 15 : 24;
    let last = 0;

    // ===== Межа туману =====
    let fogLimit = h * 0.35;

    // ===== Частинки туману =====
    interface FogParticle {
      x: number;
      y: number;
      size: number;
      speed: number;
      alpha: number;
      phase: number;
      depth: number;
    }

    let fog: FogParticle[] = [];

    const createFog = () => {
      fog = [];

      // 📱 На телефоні — менше частинок, але вони більші
      const baseCount = lowEnd ? Math.floor(w / 260) : Math.floor(w / 180);

      const create = (depth: number) => {
        fog.push({
          x: Math.random() * w,
          y: Math.random() * fogLimit,
          size: (lowEnd ? 360 : 260) * depth + Math.random() * 160,
          speed: (lowEnd ? 0.02 : 0.04) * depth,
          alpha: (lowEnd ? 0.08 : 0.07) * depth,
          phase: Math.random() * Math.PI * 2,
          depth,
        });
      };

      for (let i = 0; i < baseCount; i++) create(1);
      for (let i = 0; i < baseCount * 0.6; i++) create(0.7);
    };

    createFog();

    // ===== Фон =====
    const drawBackground = () => {
      const grad = context.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#3a4452");
      grad.addColorStop(0.35, "#2c343f");
      grad.addColorStop(1, "#1f252d");
      context.fillStyle = grad;
      context.fillRect(0, 0, w, h);
    };

    // ===== Малювання туману =====
    const drawFog = () => {
      fog.forEach((f) => {
        f.x -= f.speed;
        f.phase += lowEnd ? 0.002 : 0.003;

        // живе "дихання"
        const drift = Math.sin(f.phase) * (lowEnd ? 0.12 : 0.18);
        const radius = f.size * (1 + Math.sin(f.phase) * 0.04);

        if (f.x + radius < 0) {
          f.x = w + radius;
          f.y = Math.random() * fogLimit;
        }

        const g = context.createRadialGradient(
          f.x,
          f.y + drift,
          0,
          f.x,
          f.y + drift,
          radius
        );

        g.addColorStop(0, `rgba(240,240,245,${f.alpha})`);
        g.addColorStop(0.5, `rgba(215,215,220,${f.alpha * 0.7})`);
        g.addColorStop(0.8, `rgba(195,195,200,${f.alpha * 0.35})`);
        g.addColorStop(1, `rgba(185,185,190,0)`);

        context.fillStyle = g;
        context.beginPath();
        context.arc(f.x, f.y + drift, radius, 0, Math.PI * 2);
        context.fill();
      });
    };

    // ===== Основний цикл =====
    const loop = (time: number) => {
      if (time - last < 1000 / FPS) {
        requestAnimationFrame(loop);
        return;
      }
      last = time;

      drawBackground();
      drawFog();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
    };
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
