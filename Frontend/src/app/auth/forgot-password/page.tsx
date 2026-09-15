"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks";
import { Suspense } from "react";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const sent = searchParams.get("sent") === "true";
  const { resetPassword, loading, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");

  const validateEmail = (value: string) => {
    if (!value) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setFieldError(validateEmail(e.target.value));
    clearError();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFieldError(validateEmail(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const validationError = validateEmail(email);
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    const result = await resetPassword(email);

    if (result.success) {
      router.push(`/auth/forgot-password?sent=true&redirect=${encodeURIComponent(redirectTo)}`);
    }
  };

  if (sent) {
    return (
      <Card className="animate-slide-up">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a password reset link to <strong>{email}</strong>. The link expires in 1 hour.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-navy-500 text-center">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <button
              onClick={() => router.push(`/auth/forgot-password?redirect=${encodeURIComponent(redirectTo)}`)}
              className="text-electric-blue hover:underline font-medium"
            >
              try again
            </button>
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-3 pt-4">
          <Button variant="outline" onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`)} className="w-full">
            Back to sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4">
          <Logo size="lg" withText />
        </div>
        <CardTitle className="text-2xl">Forgot password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div
              className="animate-fade-in p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"
              role="alert"
              aria-live="polite"
            >
              {error.message}
            </div>
          )}

          <Input
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={fieldError}
            placeholder="you@example.com"
            disabled={loading}
            startIcon={<Mail className="h-4 w-4" />}
          />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {loading ? <Loader2 className="h-4 w-4" /> : "Send reset link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-3 pt-4">
        <p className="text-sm text-navy-500">
          Remember your password?{" "}
          <Link href={`/auth/login?redirect=${encodeURIComponent(redirectTo)}`} className="text-electric-blue hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="animate-slide-up">Loading...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}