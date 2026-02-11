import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import React from "react";

interface Props {
  className?: string;
  VisibilityValues: number;
}

export default function Visibility({ className, VisibilityValues }: Props) {
  const roundedVisibility = Math.round(VisibilityValues);
  const visibilityText =
    VisibilityValues >= 10
      ? "Добра видимість"
      : VisibilityValues >= 5
        ? "Середня видимість"
        : "Погана видимість";
  return (
    <section
      className={cn(
        "flex flex-col justify-between rounded-2xl h-full",
        className,
      )}
      aria-labelledby="visibility-title"
    >
      {/* Заголовок блоку */}
      <h3
        id="visibility-title"
        className="flex gap-1 items-center pl-3 pt-2 font-medium text-shadow-muted-foreground"
      >
        <Eye size={20} aria-hidden="true" />
        Видимість
      </h3>

      {/* Основне значення видимості */}
      <output
        className="text-3xl font-semibold mb-2 pl-3 pt-2"
        aria-label={`Видимість ${roundedVisibility} кілометрів`}
      >
        {roundedVisibility} км
      </output>

      {/* Пояснювальний текст */}
      <p className="text-sm text-shadow-muted-foreground mb-2 pl-3 pt-2">
        {visibilityText}
      </p>
    </section>
  );
}
