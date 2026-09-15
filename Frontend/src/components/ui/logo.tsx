import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  withText?: boolean;
}

export function Logo({ size = "md", className, withText = false }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xl",
    md: "h-10 w-10 text-2xl",
    lg: "h-12 w-12 text-3xl",
    xl: "h-16 w-16 text-4xl",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)} aria-hidden="true">
      <div
        className={cn(
          "flex items-center justify-center rounded-none bg-navy-900 text-white font-bold",
          "shadow-[5px_5px_0_rgba(15,23,42,0.92)]",
          sizeClasses[size]
        )}
        role="img"
        aria-label="Mocky"
      >
        M
      </div>
      {withText && (
        <span className={cn("font-semibold text-navy-900", textSizeClasses[size])}>
          Mocky
        </span>
      )}
    </div>
  );
}