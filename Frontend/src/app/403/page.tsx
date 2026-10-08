import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldAlert, House, LogIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "403 - Access Forbidden | Mocky",
  description: "You do not have permission to access this private interview or page.",
};

export default function Error403Page() {
  return (
    <main className="flex min-h-screen items-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="portrait-frame w-full max-w-3xl mx-auto">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Go to Mocky home" className="shrink-0">
            <Logo size="md" withText />
          </Link>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
            Error 403
          </span>
        </header>

        <section className="clay-surface mt-8 overflow-hidden rounded-[2rem] px-5 py-8 sm:mt-10 sm:px-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="flex items-center gap-3 text-sm font-bold text-amber-600">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 shadow-inner">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>Access Restricted</span>
            </div>

            <div className="max-w-xl">
              <p className="text-[clamp(4rem,18vw,8rem)] font-black leading-[0.82] tracking-tight text-navy-900">
                403
              </p>
              <h1 className="mt-5 text-3xl font-black leading-tight text-navy-900 sm:text-4xl">
                Private interview room.
              </h1>
              <p className="mt-3 max-w-md text-base leading-7 text-navy-600">
                You do not have authorization to view this interview session or protected area. Please ensure you are signed in with the account that created this session.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/auth/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full">
                  <LogIn className="h-4 w-4 mr-1" aria-hidden="true" />
                  Sign in with another account
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  <House className="h-4 w-4 mr-1" aria-hidden="true" />
                  Go to dashboard
                </Button>
              </Link>
              <Link href="/intake" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  Start an interview
                  <ArrowRight className="h-4 w-4 mr-1" aria-hidden="true" />
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t border-navy-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium text-navy-600">
              <Link href="/404" className="hover:text-electric-blue flex items-center gap-1.5 py-1">
                <AlertCircle className="h-3.5 w-3.5" /> 404 Page
              </Link>
              <Link href="/500" className="hover:text-electric-blue flex items-center gap-1.5 py-1">
                <AlertCircle className="h-3.5 w-3.5" /> 500 Server Error
              </Link>
              <Link href="/auth/signup" className="hover:text-electric-blue flex items-center gap-1.5 py-1">
                <ArrowRight className="h-3.5 w-3.5" /> Create Account
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
