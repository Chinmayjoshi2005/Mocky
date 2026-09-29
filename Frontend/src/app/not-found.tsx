import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass, House } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Page Not Found | Mocky",
  description: "The page you are looking for could not be found.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="portrait-frame w-full">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Go to Mocky home" className="shrink-0">
            <Logo size="md" withText />
          </Link>
          <span className="hidden text-right text-xs font-bold uppercase tracking-[0.18em] text-navy-500 sm:block">
            Error 404
          </span>
        </header>

        <section className="clay-surface mt-8 overflow-hidden rounded-[2rem] px-5 py-8 sm:mt-10 sm:px-10 sm:py-12">
          <div className="flex flex-col gap-8 sm:gap-10">
            <div className="flex items-center gap-3 text-sm font-bold text-electric-blue">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 shadow-inner">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>Wrong turn</span>
            </div>

            <div className="max-w-xl">
              <p className="text-[clamp(4.5rem,22vw,9rem)] font-black leading-[0.82] tracking-tight text-navy-900">
                404
              </p>
              <h1 className="mt-6 text-3xl font-black leading-tight text-navy-900 sm:text-5xl">
                This page missed the interview.
              </h1>
              <p className="mt-4 max-w-md text-base leading-7 text-navy-600 sm:text-lg">
                The address may be outdated, or the page may have moved. Let&apos;s get you back to a useful place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" className="w-full">
                  <House className="h-4 w-4" aria-hidden="true" />
                  Go to dashboard
                </Button>
              </Link>
              <Link href="/intake" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  Start an interview
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-navy-600 transition-colors hover:text-electric-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Return to the starting point
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}