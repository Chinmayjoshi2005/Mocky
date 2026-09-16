"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle2, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/hooks";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const requestedRedirect = searchParams.get("redirect");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : "/dashboard";

  const { resendVerificationEmail, loading, error, clearError } = useAuth();
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) return;
    clearError();
    setResendStatus(null);

    const result = await resendVerificationEmail(email);
    if (result.success) {
      setResendStatus("A new verification link has been sent to your inbox.");
    }
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-electric-blue">
          <Mail className="h-8 w-8" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl font-semibold text-navy-900">Check your email</CardTitle>
        <CardDescription className="text-navy-500 max-w-sm mx-auto">
          {email ? (
            <>
              We sent a verification link to <strong className="text-navy-900">{email}</strong>. Please click the link to activate your account.
            </>
          ) : (
            "We sent a verification link to your email address. Please click the link to activate your account."
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {resendStatus && (
          <div
            className="animate-fade-in p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{resendStatus}</span>
          </div>
        )}

        {error && (
          <div
            className="animate-fade-in p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"
            role="alert"
            aria-live="polite"
          >
            {error.message}
          </div>
        )}

        <div className="rounded-lg bg-navy-50 p-4 text-xs text-navy-600 space-y-1.5 border border-navy-100">
          <p className="font-medium text-navy-900">Can&apos;t find the email?</p>
          <ul className="list-disc pl-4 space-y-1 text-navy-500">
            <li>Wait a couple minutes for delivery.</li>
            <li>Check your spam or junk folder.</li>
            <li>Make sure you entered your email correctly.</li>
          </ul>
        </div>

        {email && (
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Resend verification email
          </Button>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-center gap-3 pt-2">
        <Link
          href={`/auth/login?redirect=${encodeURIComponent(redirectTo)}`}
          className="text-sm text-navy-600 hover:text-navy-900 inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="animate-slide-up text-center text-navy-500">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
