"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronUp, House, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("Next.js Error Boundary caught error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="portrait-frame w-full max-w-3xl mx-auto">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Go to Mocky home" className="shrink-0">
            <Logo size="md" withText />
          </Link>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-600">
            Application Error
          </span>
        </header>

        <section className="clay-surface mt-8 overflow-hidden rounded-[2rem] px-5 py-8 sm:mt-10 sm:px-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="flex items-center gap-3 text-sm font-bold text-red-600">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 shadow-inner">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>Runtime Exception</span>
            </div>

            <div className="max-w-xl">
              <p className="text-[clamp(3.5rem,15vw,6rem)] font-black leading-[0.82] tracking-tight text-navy-900">
                Oops!
              </p>
              <h1 className="mt-5 text-3xl font-black leading-tight text-navy-900 sm:text-4xl">
                Something went wrong in this room.
              </h1>
              <p className="mt-3 max-w-md text-base leading-7 text-navy-600">
                An unexpected client-side error prevented this page from displaying properly. You can try recovering the session or return to safety.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button size="lg" onClick={() => reset()} className="w-full sm:w-auto">
                <RotateCcw className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Try again
              </Button>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  <House className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Go to dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full sm:w-auto text-navy-600"
              >
                {showDetails ? (
                  <>
                    Hide error details
                    <ChevronUp className="h-4 w-4 ml-1.5" />
                  </>
                ) : (
                  <>
                    Show error details
                    <ChevronDown className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>

            {showDetails && (
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-xs font-mono text-navy-800 space-y-2 overflow-x-auto">
                <p className="font-bold text-red-700">Error Message:</p>
                <p className="whitespace-pre-wrap">{error.message || "Unknown error occurred"}</p>
                {error.digest && (
                  <p className="text-navy-500">
                    <span className="font-semibold text-navy-700">Error Digest:</span> {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-navy-100 flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-navy-600 transition-colors hover:text-electric-blue"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Return to Mocky home
              </Link>
              <div className="flex items-center gap-3 text-xs text-navy-500">
                <Link href="/404" className="hover:underline">404 Page</Link>
                <span>&bull;</span>
                <Link href="/500" className="hover:underline">500 Page</Link>
                <span>&bull;</span>
                <Link href="/403" className="hover:underline">403 Page</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
