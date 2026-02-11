import React from "react";
import { Youtube, X } from "lucide-react";
import Link from "next/link";
import { APP_VERSION } from "@/lib/version";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export const Footer: React.FC = () => {
  return (
    <footer role="contentinfo" itemScope itemType="https://schema.org/WPFooter">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Інформація про бренд */}
          <div className="flex items-center gap-2 text-sm">
            <p className="m-0">
              <span>© {new Date().getFullYear()}</span>

              <strong className="ml-2 font-medium" itemProp="name">
                Pogodka.org
              </strong>

              <span
                className="ml-2 text-gray-500 text-xs"
                aria-label="Версія сайту"
              >
                v{APP_VERSION}
              </span>
            </p>
          </div>

          {/* Навігація */}

          <nav
            className="flex gap-6 text-sm flex-wrap justify-center"
            aria-label="Додаткова навігація"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/agreement"
                  className="border-b border-transparent hover:border-gray-500 transition-colors duration-200 underline-offset-4"
                >
                  Користувацька угода
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>Перегляньте умови користування сайтом</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/privacypolicy"
                  className="border-b border-transparent hover:border-gray-500 transition-colors duration-200 underline-offset-4"
                >
                  Політика конфіденційності
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>Детальні умови обробки персональних даних</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/support"
                  className="border-b border-transparent hover:border-gray-500 transition-colors duration-200 underline-offset-4"
                >
                  Техпідтримка
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>Зв’яжіться з нашою службою підтримки</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/ads"
                  className="border-b border-transparent hover:border-gray-500 transition-colors duration-200 underline-offset-4"
                >
                  Реклама
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>Замовте рекламне місце на нашому сайті</p>
              </TooltipContent>
            </Tooltip>
          </nav>

          {/* Соціальні мережі */}
          <div
            className="flex gap-4"
            role="group"
            aria-label="Соціальні мережі"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://twitter.com/pogodka"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:border-gray-500 transition-colors"
                  aria-label="Twitter Pogodka.org"
                  itemProp="sameAs"
                >
                  <X size={20} aria-hidden="true" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>Twitter</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://www.youtube.com/@Pogodka-UA"
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="hover:border-gray-500 transition-colors"
                  aria-label="YouTube Pogodka.org"
                  itemProp="sameAs"
                >
                  <Youtube size={20} aria-hidden="true" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>YouTube</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </footer>
  );
};
