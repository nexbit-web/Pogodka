"use client";

import React from "react";
import { SidebarTrigger } from "../ui/sidebar";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { useDebounce } from "use-debounce";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { CircleAlert } from "lucide-react";
interface Props {
  className?: string;
}

type City = {
  id: number;
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
  const [debouncedQuery] = useDebounce(query.toLowerCase(), 200);
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
        "flex items-center h-14 px-4  border-border bg-background",
        className
      )}
    >
      <SidebarTrigger className="-ml-1 cursor-pointer" />

      {focused && (
        <div
          onClick={() => setFocused(false)}
          className="absolute top-0 left-0 bottom-0 right-0 bg-black/50 z-30"
        />
      )}

      <div className="flex-1 flex justify-center px-1.5 relative z-31">
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder="Введіть назву міста..."
          className="
        rounded-2xl
        w-full
        max-w-sm
        sm:max-w-md
        md:max-w-lg
        lg:max-w-xl
        xl:max-w-2xl
        relative
      "
          onFocus={() => setFocused(true)}
        />

        <div
          className={cn(
            "absolute w-full bg-muted  max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl  rounded-2xl top-14 shadow-md transition-all duration-200 invisible opacity-0 z-31",
            focused && "visible opacity-100 top-11"
          )}
        >
          {loading && (
            <p className="flex items-center gap-1  px-3 py-1 rounded-2xl">
              <Spinner className="size-6" /> пошук...
            </p>
          )}

          {cities.map((city) => (
            <Link key={city.id} href={""}>
              <div
                className="px-3 py-1 hover:bg-primary/10 rounded-2xl 
                  whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {city.nameUa} • 📍 {city.latitude.toFixed(4)},{" "}
                {city.longitude.toFixed(4)}
              </div>
            </Link>
          ))}

          {/* <div className="text-sm text-gray-500 mt-1">
                {city.region} • 📍 {city.latitude.toFixed(4)},{" "}
                {city.longitude.toFixed(4)}
              </div>
              <div className="text-gray-600">
                {city.nameEn} / {city.nameRu}
              </div> */}
          {/* <Link href={""}>
            <div className="px-3 py-1 hover:bg-primary/10 rounded-2xl">
              Київ
            </div>
          </Link> */}

          {query.length < 2 ? (
            <p className="px-3 py-1 rounded-2xl text-gray-500 ">
              Введіть мінімум 2 символи
            </p>
          ) : cities.length === 0 && !loading ? (
            <p className="flex gap-1 items-center px-3 py-1 rounded-2xl text-red-500">
              <CircleAlert size={20} /> Місто не знайдено
            </p>
          ) : null}
        </div>

      </div>

      <ModeToggle />
    </header>
  );
};
