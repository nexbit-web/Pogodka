"use client";

import { AnimatePresence, motion } from "framer-motion";

type Props = {
  seconds: number; // оставшееся количество секунд
};

const split = (n: number) => [Math.floor(n / 10), n % 10];

export default function AnimatedTimer({ seconds }: Props) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const [m1, m2] = split(minutes);
  const [s1, s2] = split(secs);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <AnimatedDigit value={m1} />
      <AnimatedDigit value={m2} />
      <span>:</span>
      <AnimatedDigit value={s1} />
      <AnimatedDigit value={s2} />
    </div>
  );
}

function AnimatedDigit({ value }: { value: number }) {
  return (
    <div style={{ position: "relative", width: 24, height: 32, overflow: "hidden" }}>
      <AnimatePresence>
        <motion.div
          key={value}
          initial={{ y: -32 }}
          animate={{ y: 0 }}
          exit={{ y: 32 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
