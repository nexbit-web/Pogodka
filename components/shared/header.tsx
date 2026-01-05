import React from "react";
import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { Breadcrumb, BreadcrumbList } from "../ui/breadcrumb";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { AppSidebar } from "./app-sidebar";

interface Props {
  className?: string;
}


export const Header: React.FC<Props> = ({ className }) => {
  return (
    <header
  className={cn(
    "flex items-center h-14 px-4  border-border bg-background",
    className
  )}
>
  <SidebarTrigger className="-ml-1 cursor-pointer" />

  <div className="flex-1 flex justify-center px-4">
    <Input
      placeholder="Пошук..."
      className="
        rounded-2xl
        w-full
        max-w-sm
        sm:max-w-md
        md:max-w-lg
        lg:max-w-xl
        xl:max-w-2xl
      "
    />
  </div>

  <ModeToggle />
</header>
  );
};
