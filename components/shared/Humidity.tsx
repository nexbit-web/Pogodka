import { cn } from "@/lib/utils";
import { Droplet } from "lucide-react";
import React from "react";

interface Props {
  className?: string;
  HumidityValues: number;
  DewPointValues: number;
}

export const Humidity: React.FC<Props> = ({
  className,
  HumidityValues,
  DewPointValues,
}) => {
  const roundedHumidity = Math.round(HumidityValues);
  const roundedDewPoint = Math.round(DewPointValues);

  return (
    <div
      className={cn(
        "rounded-2xl bg-black/40 backdrop-blur-md border border-white/30 shadow-md",
        className
      )}
    >
      <span className="flex gap-1 items-center pl-5 pt-2 font-medium text-shadow-muted-foreground">
        <Droplet size={20} /> ВОЛОГІСТЬ
      </span>

      <div className="text-3xl font-semibold mb-2 pl-5 pt-2 ">
        {roundedHumidity}%
      </div>

      <div className="text-sm text-shadow-muted-foreground mb-2 pl-5 pt-2 ">
        Точка роси зараз {roundedDewPoint}°
      </div>
    </div>
  );
};
