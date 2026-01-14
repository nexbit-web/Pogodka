import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import React from "react";

interface Props {
  className?: string;
  VisibilityValues: number;
}

export const Visibility: React.FC<Props> = ({
  className,
  VisibilityValues,
}) => {
  const roundedVisibility = Math.round(VisibilityValues);
  const visibilityText =
    VisibilityValues >= 10
      ? "Добра видимість"
      : VisibilityValues >= 5
      ? "Середня видимість"
      : "Погана видимість";
  return (
    <div
      className={cn(
        "rounded-2xl bg-black/5 backdrop-blur-md border border-white/10 shadow-md",
        className
      )}
    >
      {/* Заголовок */}
      <span className="flex gap-1 items-center pl-5 pt-2 font-medium text-muted-foreground">
        <Eye size={20} /> ВИДИМІСТЬ
      </span>

      <div className="text-3xl font-semibold mb-2 pl-5 pt-2 ">
        {roundedVisibility} км
      </div>

      <div className="text-sm text-muted-foreground mb-2 pl-5 pt-2 ">
        {visibilityText}
      </div>
    </div>
  );
};
