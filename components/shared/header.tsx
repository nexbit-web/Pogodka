"use client";

import React from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { useDebounce } from "use-debounce";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { CircleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
interface Props {
  className?: string;
}

type City = {
  id: number;
  slug: string;
  nameUa: string;
  nameRu: string;
  nameEn: string;
  region: string;
  latitude: number;
  longitude: number;
};

export const Header: React.FC<Props> = ({ className }) => {
  const [focused, setFocused] = React.useState(false);

  const [query, setQuery] = React.useState("");
  const [cities, setCities] = React.useState<City[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [debouncedQuery] = useDebounce(query.toLowerCase(), 500);
  React.useEffect(() => {
    if (query.length < 2) {
      setCities([]);
      return;
    }

    setLoading(true);
    fetch(`/api/cities/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        setCities(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Приводимо введений текст до нижнього реєстру
    setQuery(e.target.value.toLowerCase());
  };

  return (
    <header
      className={cn(
        "flex items-center h-14 px-4 border-border bg-background",
        className,
      )}
      role="banner"
    >
      <div
        className={cn(
          "transition-all duration-200 ease-out",
          focused
            ? "opacity-0 pointer-events-none absolute"
            : "relative opacity-100",
        )}
      >
        {/* <svg className="text-foreground  w-40" aria-hidden="true">
          <use href="/icons.svg?v=4#logo" />
        </svg> */}
      </div>

      {/* Затемнення фону при активному пошуку */}
      {focused && (
        <div
          onClick={() => setFocused(false)}
          className="fixed inset-0 bg-black/50 z-30"
          aria-hidden="true"
        />
      )}

      {/* Блок пошуку */}
      <div className="flex-1 flex justify-center px-1.5 relative z-40">
        <form
          role="search"
          className="
        flex gap-2.5 rounded-2xl relative
        w-full
        sm:max-w-md
        md:max-w-lg
        lg:max-w-xl
        xl:max-w-2xl
        mx-auto
      "
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Прихований label для доступності та SEO */}
          <label htmlFor="city-search" className="sr-only">
            Пошук міста по Україні
          </label>

          {/* Поле введення пошуку */}
          <Input
            id="city-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={handleInputChange}
            placeholder="Введіть назву міста..."
            onFocus={() => setFocused(true)}
            aria-expanded={focused}
            aria-controls="search-results"
            aria-autocomplete="list"
            className="
          rounded-2xl
          w-full
          relative
        "
          />

          {/* Кнопка закриття пошуку */}
          <div
            className={cn(
              "transition-all duration-200 ease-out",
              focused
                ? "w-9 opacity-100 translate-x-0"
                : "w-0 opacity-0 translate-x-3 pointer-events-none",
            )}
          >
            <Button
              type="button"
              onClick={() => setFocused(false)}
              variant="outline"
              size="icon"
              aria-label="Закрити пошук"
              className="rounded-full cursor-pointer"
            >
              <X />
            </Button>
          </div>
        </form>

        {/* Випадаючий список результатів */}
        <div
          id="search-results"
          role="listbox"
          aria-label="Результати пошуку міст"
          className={cn(
            "absolute w-full bg-muted rounded-2xl shadow-md transition-all duration-200 invisible opacity-0 top-14",
            "max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl",
            focused && "visible opacity-100 top-11",
          )}
        >
          {/* Індикатор завантаження */}
          {loading && (
            <p className="flex items-center gap-1 px-3 py-2 rounded-2xl">
              <Spinner className="size-5" />
              Пошук...
            </p>
          )}

          {/* Список знайдених міст */}
          {cities.map((city) => (
            <Link
              key={city.id}
              href={`/pohoda/${city.slug}`}
              role="option"
              onClick={() => {
                setQuery("");
                setFocused(false);
              }}
            >
              <div
                className="
              px-3 py-2 hover:bg-primary/10 rounded-2xl
              whitespace-nowrap overflow-hidden text-ellipsis
            "
              >
                🇺🇦 {city.nameUa}, {city.region}
              </div>
            </Link>
          ))}

          {/* Повідомлення якщо введено мало символів */}
          {query.length < 2 && !loading && (
            <p className="px-3 py-2 rounded-2xl text-gray-500">
              Введіть мінімум 2 символи
            </p>
          )}

          {/* Повідомлення якщо нічого не знайдено */}
          {query.length >= 2 && cities.length === 0 && !loading && (
            <p className="flex gap-1 items-center px-3 py-2 rounded-2xl text-red-500">
              <CircleAlert size={18} />
              Місто не знайдено
            </p>
          )}
        </div>
      </div>

      {/* Перемикач теми праворуч */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out z-20",
          focused
            ? "opacity-0 pointer-events-none absolute right-4"
            : "relative opacity-100",
        )}
      >
        <ModeToggle />
      </div>
    </header>
  );
};
