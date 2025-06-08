import { cn } from "@/lib/utils";
import React from "react";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full",
        className
      )}
      {...props}
    />
  );
}