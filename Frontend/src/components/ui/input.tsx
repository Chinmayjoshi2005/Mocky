import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, startIcon, endIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-navy-900"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <div className="pointer-events-none absolute left-3 flex items-center justify-center text-navy-400" aria-hidden="true">
              {startIcon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            ref={ref}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={describedBy}
            className={cn(
              "flex h-10 w-full rounded-none border-2 border-navy-900 bg-white px-3 py-2 text-sm text-navy-900 shadow-[3px_3px_0_rgba(15,23,42,0.86)] placeholder:text-navy-400",
              "transition-all duration-200 hover:border-electric-blue hover:shadow-[5px_5px_0_rgba(15,23,42,0.86)]",
              "focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-navy-50",
              "hover:border-navy-300",
              startIcon && "pl-10",
              endIcon && "pr-10",
              error && "border-red-500 focus:ring-red-500",
              className
            )}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 flex items-center justify-center text-navy-400">
              {endIcon}
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 text-sm text-red-600"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-navy-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };