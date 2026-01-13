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
  falling?: boolean;
  speedY?: number;
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

    // Проверка слабого устройства
    const lowEnd =
      navigator.hardwareConcurrency <= 4 ||
      (navigator as any).deviceMemory <= 2;

    // Звезды
    const starCount = lowEnd ? 50 : 120;
    const stars: Star[] = Array.from({ length: starCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.5,
      radius: Math.random() * 2 + 1, // звезды чуть больше
      alpha: Math.random() * 0.8 + 0.5, // ярче начальная прозрачность
      twinkleSpeed: Math.random() * 0.03 + 0.01, // более яркое и заметное мерцание
      falling: Math.random() < 0.01, // реже падающие звезды (1%)
      speedY: Math.random() * 5 + 8, // падают быстрее
    }));

    const drawStars = () => {
      stars.forEach((s) => {
        // Мерцание
        s.alpha += s.twinkleSpeed;
        if (s.alpha > 1 || s.alpha < 0.4) s.twinkleSpeed *= -1; // диапазон мерцания больше

        // Падающие звезды
        if (s.falling) {
          s.y += s.speedY!;
          s.x += s.speedY! * 0.5; // небольшой наклон
          if (s.y > h || s.x > w) {
            s.y = Math.random() * h * 0.5;
            s.x = Math.random() * w;
          }
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
      });
    };

    // Облака
    const cloudLayers = [
      {
        count: lowEnd ? 3 : 6,
        speed: lowEnd ? 0.0015 : 0.003,
        alpha: 0.05,
        widthRange: [150, 250],
        heightRange: [25, 50],
      },
    ];

    // const clouds: Cloud[] = [];
    // cloudLayers.forEach((layer) => {
    //   for (let i = 0; i < layer.count; i++) {
    //     const wC =
    //       layer.widthRange[0] +
    //       Math.random() * (layer.widthRange[1] - layer.widthRange[0]);
    //     const hC =
    //       layer.heightRange[0] +
    //       Math.random() * (layer.heightRange[1] - layer.heightRange[0]);
    //     clouds.push({
    //       x: Math.random() * w,
    //       y: Math.random() * h * 0.2,
    //       width: wC,
    //       height: hC,
    //       alpha: layer.alpha,
    //       speed: layer.speed,
    //       swayAngle: Math.random() * Math.PI * 2,
    //       swayAmount: Math.random() * 0.03 + 0.02,
    //     });
    //   }
    // });

    // const drawClouds = () => {
    //   clouds.forEach((c) => {
    //     c.swayAngle += 0.005;
    //     const wMod = c.width * (0.95 + c.swayAmount * Math.sin(c.swayAngle));
    //     const hMod =
    //       c.height * (0.95 + c.swayAmount * Math.sin(c.swayAngle * 1.2));
    //     const grad = ctx.createRadialGradient(
    //       c.x,
    //       c.y,
    //       wMod * 0.1,
    //       c.x,
    //       c.y,
    //       wMod
    //     );
    //     grad.addColorStop(0, `rgba(255,255,255,${c.alpha})`);
    //     grad.addColorStop(1, `rgba(255,255,255,0)`);
    //     ctx.fillStyle = grad;
    //     ctx.beginPath();
    //     ctx.ellipse(c.x, c.y, wMod, hMod, 0, 0, Math.PI * 2);
    //     ctx.fill();

    //     c.x -= c.speed * w;
    //     if (c.x + c.width < 0) c.x = w + Math.random() * 100;
    //   });
    // };

    const drawBackground = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#111122");
      grad.addColorStop(1, "#1a2436");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    };

    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      drawBackground();
      drawStars();
      // drawClouds();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => window.removeEventListener("resize", resize);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1]"
    />
  );
};
