import React from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export const Container: React.FC<Props> = ({ children, className }) => {
  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8 max-w-7xl", className)}
    >
      {children}
    </div>
  );
};
