"use client";

import React from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { useDebounce } from "use-debounce";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { CircleAlert, Search, X } from "lucide-react";
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

// Передзавантажуємо популярні міста відразу при імпорті модуля (один раз)
let preloadedPopular: City[] | null = null;
let preloadPromise: Promise<void> | null = null;

function preloadPopularCities() {
  if (preloadedPopular || preloadPromise) return;
  preloadPromise = fetch("/api/cities/search?q=")
    .then((r) => r.json())
    .then((data) => {
      preloadedPopular = data;
    })
    .catch(() => {});
}

// Запускаємо передзавантаження відразу
if (typeof window !== "undefined") {
  preloadPopularCities();
}

export const Header: React.FC<Props> = ({ className }) => {
  const [focused, setFocused] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [cities, setCities] = React.useState<City[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [popularCities, setPopularCities] = React.useState<City[]>(
    preloadedPopular ?? [],
  );

  const [debouncedQuery] = useDebounce(query, 400);

  // Завантажуємо популярні якщо ще не завантажені
  React.useEffect(() => {
    if (preloadedPopular) {
      setPopularCities(preloadedPopular);
      return;
    }
    preloadPromise?.then(() => {
      if (preloadedPopular) setPopularCities(preloadedPopular);
    });
  }, []);

  // Пошук міст
  React.useEffect(() => {
    if (debouncedQuery.length < 2) {
      setCities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    fetch(`/api/cities/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setCities(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery("");
    setCities([]);
  };

  const handleClose = () => {
    setFocused(false);
    handleClear();
  };

  const handleSelect = () => {
    setQuery("");
    setCities([]);
    setFocused(false);
  };

  // Що показувати у дропдауні
  const showPopular = query.length < 2;
  const displayCities = showPopular ? popularCities : cities;

  return (
    <header
      className={cn(
        "flex items-center h-14 px-4 border-border bg-background",
        className,
      )}
      role="banner"
    >
      {/* Логотип */}
      <div
        className={cn(
          "transition-all duration-200 ease-out",
          focused
            ? "opacity-0 pointer-events-none absolute"
            : "relative opacity-100",
        )}
      >
        {/* Логотип тут */}
      </div>

      {/* Затемнення фону */}
      {focused && (
        <div
          onClick={handleClose}
          className="fixed inset-0 bg-black/50 z-30"
          aria-hidden="true"
        />
      )}

      {/* Пошук */}
      <div className="flex-1 flex justify-center px-1.5 relative z-40">
        <form
          role="search"
          className="flex gap-2.5 rounded-2xl relative w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto"
          onSubmit={(e) => e.preventDefault()}
        >
          <label htmlFor="city-search" className="sr-only">
            Пошук міста по Україні
          </label>

          {/* Wrapper з піктограмою пошуку та хрестиком */}
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-50"
              size={16}
              aria-hidden="true"
            />

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
              className="rounded-2xl w-full pl-9 pr-9"
            />

            {/* Хрестик праворуч - тільки якщо є текст */}
            {query.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Очистити пошук"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-50"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Кнопка закрити (X) — з'являється під час фокусування */}
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
              onClick={handleClose}
              variant="outline"
              size="icon"
              aria-label="Закрити пошук"
              className="rounded-full cursor-pointer"
            >
              <X />
            </Button>
          </div>
        </form>

        {/* Дропдаун із результатами */}
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
          {/* Скрольований контейнер */}
          <style>{`
            .cities-scroll::-webkit-scrollbar { width: 4px; }
            .cities-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; transition: background 0.2s; }
            .cities-scroll:hover::-webkit-scrollbar-thumb { background: hsl(var(--border)); }
            .cities-scroll { scrollbar-width: none; }
            .cities-scroll:hover { scrollbar-width: thin; scrollbar-color: hsl(var(--border)) transparent; }
          `}</style>
          {/* Завантаження */}
          {loading && (
            <p className="flex items-center gap-1 px-3 py-2 rounded-2xl">
              <Spinner className="size-5" />
              Пошук...
            </p>
          )}

          {/* Список міст зі скролом */}
          {!loading && displayCities.length > 0 && (
            <div className="overflow-hidden rounded-2xl">
              <div
                className="cities-scroll overflow-y-auto"
                style={{ maxHeight: "calc(7 * 40px)" }}
              >
                {displayCities.map((city) => (
                  <Link
                    key={city.id}
                    href={`/pohoda/${city.slug}`}
                    role="option"
                    onClick={handleSelect}
                    prefetch={false}
                  >
                    <div
                      className="px-3 py-2 hover:bg-primary/10 whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ height: 40, lineHeight: "24px" }}
                    >
                      🇺🇦 {city.nameUa},{" "}
                      <span className="text-muted-foreground">
                        {city.region}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Нічого не знайдено */}
          {!loading && !showPopular && cities.length === 0 && (
            <p className="flex gap-1 items-center px-3 py-2 rounded-2xl text-red-500">
              <CircleAlert size={18} />
              Місто не знайдено
            </p>
          )}
        </div>
      </div>

      {/* Перемикач теми */}
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
