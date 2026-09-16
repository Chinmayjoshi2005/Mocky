import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Terms of Service | Mocky",
  description: "Terms of Service for Mocky AI technical interview platform",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-navy-50/50">
      <header className="border-b border-navy-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center" aria-label="Mocky home">
            <Logo size="md" withText />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-navy-600 hover:text-navy-900 hover:bg-navy-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="portrait-frame">
          <Card className="shadow-xs">
            <CardHeader className="border-b border-navy-100 pb-6">
              <CardTitle className="text-2xl font-bold text-navy-900">Terms of Service</CardTitle>
              <CardDescription>Last updated: September 2026</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 text-sm text-navy-700 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">1. Acceptance of Terms</h2>
                <p>
                  By creating an account or accessing Mocky (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">2. Description of Service</h2>
                <p>
                  Mocky provides an AI-driven mock technical interview platform that generates personalized interview questions from candidate resumes and job descriptions, delivering structured feedback for interview preparation.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">3. User Accounts & Security</h2>
                <p>
                  You are responsible for safeguarding your credentials and for all activities conducted under your account. Promptly notify Mocky of any unauthorized account access or security breaches.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">4. User Content & Intellectual Property</h2>
                <p>
                  You retain ownership of any resume materials or job descriptions submitted to the Service. Mocky processes your materials solely for delivering mock interview simulations and personalizing your technical prep sessions.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">5. Acceptable Use</h2>
                <p>
                  You agree not to misuse the Service, reverse engineer platform components, bypass security boundaries, or use Mocky to transmit malicious code or unlawful content.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">6. Contact Information</h2>
                <p>
                  Questions about these Terms of Service should be directed to support@mocky.ai.
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-navy-200 bg-white py-6">
        <p className="mx-auto max-w-5xl text-center text-xs text-navy-500 px-4">
          &copy; {new Date().getFullYear()} Mocky. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
