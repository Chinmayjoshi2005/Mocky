"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Compass,
  ExternalLink,
  RotateCcw,
  ServerCrash,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

function ErrorHubContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "overview";
  const [selectedTab, setSelectedTab] = useState<string>(initialCode);
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error("This is a simulated runtime exception to verify the error.tsx error boundary!");
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="portrait-frame w-full max-w-4xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" aria-label="Go to Mocky home" className="shrink-0">
            <Logo size="md" withText />
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-electric-blue">
              Mocky Error Hub &amp; Directory
            </span>
          </div>
        </header>

        {/* Directory Card */}
        <Card className="clay-surface border-navy-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-electric-blue text-sm font-bold">
              <Zap className="h-4 w-4" />
              <span>Error Pages Navigation &amp; Testing Directory</span>
            </div>
            <CardTitle className="text-2xl font-bold text-navy-900">
              Custom Error Pages Direct Links
            </CardTitle>
            <CardDescription>
              Direct links to access, inspect, and test each custom error page in the Mocky application:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* 404 Not Found Card */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-electric-blue font-bold text-sm">
                      <Compass className="h-4 w-4" />
                    </span>
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-electric-blue border border-blue-200">
                      HTTP 404
                    </span>
                  </div>
                  <h3 className="font-bold text-navy-900 text-base">Page Not Found</h3>
                  <p className="mt-1 text-xs text-navy-600">
                    Shown when a candidate accesses a missing route or outdated link.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-blue-100 flex flex-col gap-2">
                  <Link
                    href="/404"
                    className="inline-flex items-center justify-between text-xs font-bold text-electric-blue hover:underline"
                  >
                    <span>Direct route: /404</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/broken-test-link"
                    className="inline-flex items-center justify-between text-xs text-navy-600 hover:text-navy-900"
                  >
                    <span>Test wildcard route</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* 500 Server Error Card */}
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 font-bold text-sm">
                      <ServerCrash className="h-4 w-4" />
                    </span>
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-red-600 border border-red-200">
                      HTTP 500
                    </span>
                  </div>
                  <h3 className="font-bold text-navy-900 text-base">Server Error</h3>
                  <p className="mt-1 text-xs text-navy-600">
                    Dedicated 500 internal server error page with retry and recovery actions.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-red-100 flex flex-col gap-2">
                  <Link
                    href="/500"
                    className="inline-flex items-center justify-between text-xs font-bold text-red-600 hover:underline"
                  >
                    <span>Direct route: /500</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* 403 Forbidden Card */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold text-sm">
                      <ShieldAlert className="h-4 w-4" />
                    </span>
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                      HTTP 403
                    </span>
                  </div>
                  <h3 className="font-bold text-navy-900 text-base">Access Forbidden</h3>
                  <p className="mt-1 text-xs text-navy-600">
                    Shown for unauthorized room or private interview session access.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-100 flex flex-col gap-2">
                  <Link
                    href="/403"
                    className="inline-flex items-center justify-between text-xs font-bold text-amber-700 hover:underline"
                  >
                    <span>Direct route: /403</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Live Error Boundary Tester */}
            <div className="rounded-xl border border-navy-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-navy-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Test Live React Error Boundary (error.tsx)
                </h4>
                <p className="text-xs text-navy-500 mt-0.5">
                  Click the button to trigger a controlled client-side React exception and observe the error boundary interface.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShouldCrash(true)}
                className="shrink-0 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                Trigger Runtime Error
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Interactive In-Page Preview */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-navy-900">Interactive Error Previewer</h2>
            <div className="flex gap-2">
              {[
                { id: "404", label: "Preview 404" },
                { id: "500", label: "Preview 500" },
                { id: "403", label: "Preview 403" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedTab === tab.id
                      ? "bg-navy-900 text-white shadow-xs"
                      : "bg-white text-navy-600 hover:bg-navy-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-navy-200 bg-white p-6 sm:p-8">
            {selectedTab === "404" && (
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-electric-blue">
                  <Compass className="h-3.5 w-3.5" /> 404 Preview
                </span>
                <p className="text-5xl font-black text-navy-900">404</p>
                <h3 className="text-2xl font-bold text-navy-900">This page missed the interview.</h3>
                <p className="text-sm text-navy-600 max-w-lg">
                  The address may be outdated, or the page may have moved. All candidate intake progress is preserved.
                </p>
                <div className="flex gap-3 pt-2">
                  <Link href="/404">
                    <Button size="sm">Open Full 404 Page</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">Go to Dashboard</Button>
                  </Link>
                </div>
              </div>
            )}

            {selectedTab === "500" && (
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
                  <ServerCrash className="h-3.5 w-3.5" /> 500 Preview
                </span>
                <p className="text-5xl font-black text-navy-900">500</p>
                <h3 className="text-2xl font-bold text-navy-900">Our interview room hit a snag.</h3>
                <p className="text-sm text-navy-600 max-w-lg">
                  An unexpected server condition halted the request. Your interview answers and audio data are safe.
                </p>
                <div className="flex gap-3 pt-2">
                  <Link href="/500">
                    <Button size="sm">Open Full 500 Page</Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry
                  </Button>
                </div>
              </div>
            )}

            {selectedTab === "403" && (
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                  <ShieldAlert className="h-3.5 w-3.5" /> 403 Preview
                </span>
                <p className="text-5xl font-black text-navy-900">403</p>
                <h3 className="text-2xl font-bold text-navy-900">Private interview room.</h3>
                <p className="text-sm text-navy-600 max-w-lg">
                  Access is restricted to authorized candidates. Sign in with the account assigned to this mock session.
                </p>
                <div className="flex gap-3 pt-2">
                  <Link href="/403">
                    <Button size="sm">Open Full 403 Page</Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm">Sign In</Button>
                  </Link>
                </div>
              </div>
            )}

            {selectedTab === "overview" && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-navy-900">Select an error above to preview</h3>
                <p className="text-sm text-navy-600">
                  You can switch between 404, 500, and 403 views using the preview buttons, or click direct links to view the full standalone error pages.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Footer links */}
        <footer className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-navy-200 text-xs text-navy-500">
          <Link href="/" className="inline-flex items-center gap-1.5 text-navy-700 hover:text-electric-blue font-medium">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Mocky Home
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="hover:underline">Login</Link>
            <Link href="/auth/signup" className="hover:underline">Sign Up</Link>
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default function ErrorHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-navy-500">Loading error hub...</div>}>
      <ErrorHubContent />
    </Suspense>
  );
}
