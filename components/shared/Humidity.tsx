import { cn } from "@/lib/utils";
import { Droplet } from "lucide-react";
import React from "react";

interface Props {
  className?: string;
  HumidityValues: number;
  DewPointValues: number;
}

export default function Humidity({
  className,
  HumidityValues,
  DewPointValues,
}: Props) {
  const roundedHumidity = Math.round(HumidityValues);
  const roundedDewPoint = Math.round(DewPointValues);

  return (
    <section
      className={cn(
        "flex flex-col justify-between rounded-2xl h-full",
        className,
      )}
      aria-labelledby="humidity-title"
    >
      {/* Заголовок блоку */}
      <h3
        id="humidity-title"
        className="flex gap-1 items-center pl-3 pt-2 font-medium text-shadow-muted-foreground"
      >
        <Droplet size={20} aria-hidden="true" />
        Вологість
      </h3>

      {/* Основне значення вологості */}
      <output
        className="text-3xl font-semibold mb-2 pl-3 pt-2"
        aria-label={`Вологість ${roundedHumidity} відсотків`}
      >
        {roundedHumidity}%
      </output>

      {/* Додаткова інформація */}
      <p className="text-sm text-shadow-muted-foreground mb-2 pl-3 pt-2">
        Точка роси зараз {roundedDewPoint}°
      </p>
    </section>
  );
}
