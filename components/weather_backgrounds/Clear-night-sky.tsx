"use client";

import { useEffect, useRef } from "react";

interface ClearNightSkyProps {
  width?: number;
  height?: number;
}

export const ClearNightSky: React.FC<ClearNightSkyProps> = ({ width, height }) => {
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
    };
    window.addEventListener("resize", resize);

    // ===== Перевірка слабкого пристрою =====
    const lowEnd = navigator.hardwareConcurrency <= 4 || (navigator as any).deviceMemory <= 2;

    // ===== FPS =====
    const FPS = lowEnd ? 15 : 24; // слабкі пристрої менше FPS
    let last = 0;

    // ===== Зірки =====
    const starCount = lowEnd ? 40 : 90;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * 0.95 + 0.025,
      y: Math.random() * 0.45 + 0.05,
      radius: Math.random() * 1 + 0.5,
      alpha: Math.random() * 0.5 + 0.3,
      twinkleSpeed: Math.random() * 0.01 + 0.002,
    }));

    const drawStars = () => {
      stars.forEach((s) => {
        context.beginPath();
        context.arc(s.x * w, s.y * h, s.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(255,255,255,${s.alpha})`;
        context.fill();
        s.alpha += s.twinkleSpeed;
        if (s.alpha > 1 || s.alpha < 0.3) s.twinkleSpeed *= -1;
      });
    };

    // ===== Падаюча зірка =====
    let shootingStar: null | { x: number; y: number; radius: number; speed: number; angle: number; alpha: number } = null;
    const createShootingStar = () => {
      shootingStar = {
        x: Math.random() * 0.8 + 0.1,
        y: Math.random() * 0.4 + 0.05,
        radius: Math.random() * 1 + 0.5,
        speed: 0.01 + Math.random() * 0.01,
        angle: Math.PI / 4,
        alpha: 1,
      };
    };
    const drawShootingStar = () => {
      if (!shootingStar) return;
      context.beginPath();
      context.arc(shootingStar.x * w, shootingStar.y * h, shootingStar.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(255,255,255,${shootingStar.alpha})`;
      context.fill();
      shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
      shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
      shootingStar.alpha -= 0.02;
      if (shootingStar.alpha <= 0 || shootingStar.x > 1 || shootingStar.y > 1) shootingStar = null;
    };

    // ===== Хмари =====
    const cloudLayers = [
      { count: lowEnd ? 3 : 6, speed: 0.0001, alpha: 0.02, widthRange: [150, 250], heightRange: [25, 50] },
    ];
    const clouds: { x: number; y: number; width: number; height: number; baseWidth: number; baseHeight: number; speed: number; alpha: number; swayAngle: number; swayAmount: number }[] = [];
    cloudLayers.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const wC = layer.widthRange[0] + Math.random() * (layer.widthRange[1] - layer.widthRange[0]);
        const hC = layer.heightRange[0] + Math.random() * (layer.heightRange[1] - layer.heightRange[0]);
        clouds.push({
          x: Math.random(),
          y: Math.random() * 0.18 + 0.02,
          width: wC,
          height: hC,
          baseWidth: wC,
          baseHeight: hC,
          speed: layer.speed,
          alpha: layer.alpha,
          swayAngle: Math.random() * Math.PI * 2,
          swayAmount: Math.random() * 0.03 + 0.02,
        });
      }
    });

    const drawClouds = () => {
      clouds.forEach((c) => {
        c.swayAngle += 0.0005;
        const wMod = c.baseWidth * (0.95 + c.swayAmount * Math.sin(c.swayAngle));
        const hMod = c.baseHeight * (0.95 + c.swayAmount * Math.sin(c.swayAngle * 1.2));
        const grad = context.createRadialGradient(c.x * w, c.y * h, wMod * 0.1, c.x * w, c.y * h, wMod);
        grad.addColorStop(0, `rgba(255,255,255,${c.alpha})`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);
        context.fillStyle = grad;
        context.beginPath();
        context.ellipse(c.x * w, c.y * h, wMod, hMod, 0, 0, Math.PI * 2);
        context.fill();
        c.x -= c.speed;
        if (c.x < -0.2) c.x = 1.2;
      });
    };

    // ===== Фон =====
    const drawBackground = () => {
      const grad = context.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#000011");
      grad.addColorStop(1, "#0b1a33");
      context.fillStyle = grad;
      context.fillRect(0, 0, w, h);
    };

    // ===== Основний цикл =====
    const loop = (time: number) => {
      if (time - last < 1000 / FPS) {
        requestAnimationFrame(loop);
        return;
      }
      last = time;
      drawBackground();
      drawStars();
      drawClouds();
      drawShootingStar();
      if (!shootingStar && Math.random() < 0.002) createShootingStar();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => window.removeEventListener("resize", resize);
  }, [width, height]);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1 }} />;
};
