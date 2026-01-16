import React from "react";
import { Youtube, X } from "lucide-react";
import Link from "next/link";
import { APP_VERSION } from "@/app/version";

export const Footer: React.FC = () => {
  return (
    <footer className="">
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Бренд */}
        <div className="flex items-center gap-2 text-sm">
          <span>Pogodka.org</span>
          <span className="ml-2 ">© 2026</span>
          {/* Версія сайту */}
          <span className=" text-gray-500 text-xs">v{APP_VERSION}</span>
        </div>

        {/* Навигація */}
        <div className="flex gap-6 text-sm flex-wrap justify-center">
          <Link
            href="/agreement"
            className="hover:text-primary border-b border-transparent  transition-colors duration-200"
          >
            Угода користувача
          </Link>
          <a
            href="/privacypolicy"
            className="hover:text-primary border-b border-transparent  transition-colors duration-200"
          >
            Угода про конфіденційність
          </a>
          <a href="/privacy" className="hover:text-primary border-b border-transparent  transition-colors duration-200">
            Техпідтримка
          </a>
          <a href="/privacy" className="hover:text-primary border-b border-transparent  transition-colors duration-200">
            Реклама
          </a>
        </div>

        {/* Соц. сети */}
        <div className="flex gap-4 text-gray-300">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            <X size={20} />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            <Youtube size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
};
