"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw, ServerCrash, House, AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function Error500Page() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <main className="flex min-h-screen items-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="portrait-frame w-full max-w-3xl mx-auto">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Go to Mocky home" className="shrink-0">
            <Logo size="md" withText />
          </Link>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-600">
            Error 500
          </span>
        </header>

        <section className="clay-surface mt-8 overflow-hidden rounded-[2rem] px-5 py-8 sm:mt-10 sm:px-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="flex items-center gap-3 text-sm font-bold text-red-600">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 shadow-inner">
                <ServerCrash className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>Internal Server Error</span>
            </div>

            <div className="max-w-xl">
              <p className="text-[clamp(4rem,18vw,8rem)] font-black leading-[0.82] tracking-tight text-navy-900">
                500
              </p>
              <h1 className="mt-5 text-3xl font-black leading-tight text-navy-900 sm:text-4xl">
                Our interview room hit a snag.
              </h1>
              <p className="mt-3 max-w-md text-base leading-7 text-navy-600">
                An unexpected condition stopped the server from fulfilling your request. Don&apos;t worry, your interview progress and resume data remain intact.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button size="lg" onClick={handleReload} className="w-full sm:w-auto">
                <RotateCcw className="h-4 w-4 mr-1" aria-hidden="true" />
                Try again
              </Button>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  <House className="h-4 w-4 mr-1" aria-hidden="true" />
                  Go to dashboard
                </Button>
              </Link>
              <Link href="/auth/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  <LogIn className="h-4 w-4 mr-1" aria-hidden="true" />
                  Sign in
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t border-navy-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium text-navy-600">
              <Link href="/404" className="hover:text-electric-blue flex items-center gap-1.5 py-1">
                <AlertCircle className="h-3.5 w-3.5" /> 404 Page
              </Link>
              <Link href="/403" className="hover:text-electric-blue flex items-center gap-1.5 py-1">
                <AlertCircle className="h-3.5 w-3.5" /> 403 Forbidden
              </Link>
              <Link href="/intake" className="hover:text-electric-blue flex items-center gap-1.5 py-1">
                <ArrowRight className="h-3.5 w-3.5" /> Start Interview
              </Link>
              <Link href="/error" className="hover:text-electric-blue flex items-center gap-1.5 py-1">
                <AlertCircle className="h-3.5 w-3.5" /> Error Hub
              </Link>
            </div>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-navy-600 transition-colors hover:text-electric-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Return to Mocky home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
