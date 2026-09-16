import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Privacy Policy | Mocky",
  description: "Privacy Policy for Mocky AI technical interview platform",
};

export default function PrivacyPage() {
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
              <CardTitle className="text-2xl font-bold text-navy-900">Privacy Policy</CardTitle>
              <CardDescription>Last updated: September 2026</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 text-sm text-navy-700 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">1. Information We Collect</h2>
                <p>
                  When you use Mocky, we collect information you provide directly to us:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-navy-600">
                  <li><strong>Account Information:</strong> Email address, encrypted authentication credentials, and profile name.</li>
                  <li><strong>Interview Preparation Materials:</strong> Resumes, target job descriptions, and interview responses you choose to submit for mock simulations.</li>
                  <li><strong>Usage Data:</strong> Timestamps, authentication sessions, and feature interaction metrics.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">2. How We Use Your Information</h2>
                <p>
                  We utilize your information strictly to operate and personalize Mocky:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-navy-600">
                  <li>Authenticating your account and maintaining secure sessions.</li>
                  <li>Extracting relevant skills to generate personalized technical interview scenarios.</li>
                  <li>Providing detailed, actionable feedback on your technical interview performance.</li>
                  <li>Responding to your support inquiries and platform notifications.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">3. Data Security & Storage</h2>
                <p>
                  Your account data and credentials are stored securely via Supabase utilizing enterprise-grade encryption in transit and at rest. We implement row-level security and strict access controls to ensure your interview data remains private to your account.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">4. Data Sharing & Third Parties</h2>
                <p>
                  We do not sell, rent, or monetize your personal information or resume materials. We share data only with essential infrastructure providers (such as Supabase for database and authentication hosting) strictly necessary to run the platform.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">5. Your Rights and Account Management</h2>
                <p>
                  You can update your email address or change your password at any time directly through your Mocky dashboard. To request complete account deletion and data removal, reach out to our team at privacy@mocky.ai.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-navy-900">6. Contact Us</h2>
                <p>
                  If you have any questions or concerns regarding this Privacy Policy, contact us at privacy@mocky.ai.
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
