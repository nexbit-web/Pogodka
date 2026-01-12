"use client";

import { useEffect, useRef } from "react";

interface NightSkyProps {
  width?: number;
  height?: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
  speed: number;
  swayAngle: number;
  swayAmount: number;
}

export const NightCloudySky: React.FC<NightSkyProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    // ===== Проверка слабого устройства =====
    const lowEnd =
      navigator.hardwareConcurrency <= 4 ||
      (navigator as any).deviceMemory <= 2;

    // ===== FPS =====
    const FPS = lowEnd ? 15 : 24;
    let last = 0;

    // ===== Звезды =====
    const starCount = lowEnd ? 50 : 90;
    const stars: Star[] = Array.from({ length: starCount }, () => ({
      x: Math.random(),
      y: Math.random() * 0.45,
      radius: Math.random() * 1 + 0.5,
      alpha: Math.random() * 0.5 + 0.3,
      twinkleSpeed: Math.random() * 0.01 + 0.002,
    }));

    const drawStars = () => {
      stars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
        s.alpha += s.twinkleSpeed;
        if (s.alpha > 1 || s.alpha < 0.3) s.twinkleSpeed *= -1;
      });
    };

    // ===== Хмари =====
    const cloudLayers = [
      {
        count: lowEnd ? 3 : 6,
        speed: 0.0001,
        alpha: 0.02,
        widthRange: [150, 250],
        heightRange: [25, 50],
      },
    ];
    const clouds: Cloud[] = [];
    cloudLayers.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const wC =
          layer.widthRange[0] +
          Math.random() * (layer.widthRange[1] - layer.widthRange[0]);
        const hC =
          layer.heightRange[0] +
          Math.random() * (layer.heightRange[1] - layer.heightRange[0]);
        clouds.push({
          x: Math.random(),
          y: Math.random() * 0.18 + 0.02,
          width: wC,
          height: hC,
          alpha: layer.alpha,
          speed: layer.speed,
          swayAngle: Math.random() * Math.PI * 2,
          swayAmount: Math.random() * 0.03 + 0.02,
        });
      }
    });

    const drawClouds = () => {
      clouds.forEach((c) => {
        c.swayAngle += 0.0005;
        const wMod = c.width * (0.95 + c.swayAmount * Math.sin(c.swayAngle));
        const hMod =
          c.height * (0.95 + c.swayAmount * Math.sin(c.swayAngle * 1.2));
        const grad = ctx.createRadialGradient(
          c.x * w,
          c.y * h,
          wMod * 0.1,
          c.x * w,
          c.y * h,
          wMod
        );
        grad.addColorStop(0, `rgba(255,255,255,${c.alpha})`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(c.x * w, c.y * h, wMod, hMod, 0, 0, Math.PI * 2);
        ctx.fill();

        c.x -= c.speed;
        if (c.x < -0.2) c.x = 1.2;
      });
    };

    // ===== Фон =====
    const drawBackground = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#111122");
      grad.addColorStop(1, "#1a2436");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    };

    // ===== Основной цикл =====
    const loop = (time: number) => {
      if (time - last < 1000 / FPS) {
        requestAnimationFrame(loop);
        return;
      }
      last = time;
      drawBackground();
      drawStars();
      drawClouds();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    return () => window.removeEventListener("resize", resize);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
};
