"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks";
import type { AuthFormData } from "@/types/auth";
import { Suspense } from "react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect =
    searchParams.get("redirect") ||
    searchParams.get("returnUrl") ||
    searchParams.get("next");

  const isInternal = Boolean(requestedRedirect && requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//"));
  const isAuthRoute = Boolean(
    requestedRedirect &&
    (requestedRedirect.startsWith("/auth/login") ||
      requestedRedirect.startsWith("/auth/signup") ||
      requestedRedirect === "/login" ||
      requestedRedirect === "/signup" ||
      requestedRedirect === "/register")
  );
  const redirectTo = isInternal && !isAuthRoute && requestedRedirect ? requestedRedirect : "/dashboard";

  const verified = searchParams.get("verified") === "true";
  const callbackError = searchParams.get("error");
  const { signIn, resendVerificationEmail, loading, error, clearError } = useAuth();

  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<AuthFormData>>({});
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const validateField = (name: string, value: string) => {
    let err = "";
    switch (name) {
      case "email":
        if (!value) err = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) err = "Enter a valid email address";
        break;
      case "password":
        if (!value) err = "Password is required";
        break;
    }
    return err;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const err = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
    clearError();
    setResendStatus(null);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleResendConfirmation = async () => {
    if (!formData.email) return;
    setIsResending(true);
    setResendStatus(null);
    const result = await resendVerificationEmail(formData.email);
    setIsResending(false);
    if (result.success) {
      setResendStatus("Verification email sent! Check your inbox.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setResendStatus(null);

    let hasErrors = false;
    const newFieldErrors: Partial<AuthFormData> = {};

    (Object.keys(formData) as Array<keyof AuthFormData>).forEach((key) => {
      const err = validateField(key, formData[key] as string);
      if (err) {
        newFieldErrors[key] = err;
        hasErrors = true;
      }
    });

    setFieldErrors(newFieldErrors);
    if (hasErrors) return;

    const result = await signIn({ email: formData.email, password: formData.password });

    if (result.success) {
      router.push(redirectTo);
      router.refresh();
    }
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4">
          <Logo size="lg" withText />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to continue to your private AI interview room.
        </CardDescription>
        {verified && (
          <p className="mt-3 text-sm text-green-600" role="status">
            Email verified! You can now sign in.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {(error || callbackError) && (
            <div
              className="animate-fade-in p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm space-y-2"
              role="alert"
              aria-live="polite"
            >
              <div>{error?.message || callbackError}</div>
              {error?.message?.toLowerCase().includes("email not confirmed") && (
                <div className="pt-1 border-t border-red-200 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isResending || !formData.email}
                    onClick={handleResendConfirmation}
                    className="h-8 text-xs bg-white text-navy-800 hover:bg-red-50"
                  >
                    {isResending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Resend verification email
                  </Button>
                  {!formData.email && (
                    <span className="text-xs text-red-600">Enter your email above to resend</span>
                  )}
                </div>
              )}
            </div>
          )}

          {resendStatus && (
            <div
              className="animate-fade-in p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm"
              role="status"
            >
              {resendStatus}
            </div>
          )}

          <Input
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={fieldErrors.email}
            placeholder="you@example.com"
            disabled={loading}
          />

          <Input
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={fieldErrors.password}
            placeholder="Enter your password"
            disabled={loading}
            endIcon={
              <button
                type="button"
                className="text-navy-400 hover:text-navy-600 transition-colors focus:outline-none flex items-center justify-center"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <div className="flex items-center justify-end">
            <Link
              href={`/auth/forgot-password?redirect=${encodeURIComponent(redirectTo)}`}
              className="text-sm text-electric-blue hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-3 pt-4">
        <p className="text-sm text-navy-500">
          Don&apos;t have an account?{" "}
          <Link href={`/auth/signup?redirect=${encodeURIComponent(redirectTo)}`} className="text-electric-blue hover:underline font-medium">
            Create one
          </Link>
        </p>
        <p className="text-xs text-navy-400 text-center">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-navy-600">Terms of Service</Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-navy-600">Privacy Policy</Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="animate-slide-up">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}