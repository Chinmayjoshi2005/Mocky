"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePassword, loading, error, clearError } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function checkRecoverySession() {
      // 1. Check if Supabase client already has an active session (e.g. from callback redirect)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (isMounted) {
          setHasValidSession(true);
          setCheckingSession(false);
        }
        return;
      }

      // 2. Check if a PKCE code was passed directly in query params
      const code = searchParams.get("code");
      if (code) {
        const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!codeError && data.session) {
          if (isMounted) {
            setHasValidSession(true);
            setCheckingSession(false);
          }
          return;
        }
      }

      // 3. Listen for auth state changes (e.g. Supabase processing hash fragment recovery tokens on client)
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, currentSession) => {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && currentSession)) {
          if (isMounted) {
            setHasValidSession(true);
            setCheckingSession(false);
          }
        }
      });
      subscription = sub;

      // 4. Fallback timeout: if after 1.5s no valid session/recovery state is detected, show expired state
      timer = setTimeout(() => {
        if (isMounted) {
          setCheckingSession(false);
        }
      }, 1500);
    }

    checkRecoverySession();

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [searchParams, supabase]);

  const validatePassword = (value: string) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(value)) return "Password must contain at least one number";
    return "";
  };

  const validateConfirmPassword = (confirmVal: string, passVal: string) => {
    if (!confirmVal) return "Please confirm your password";
    if (confirmVal !== passVal) return "Passwords do not match";
    return "";
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setFieldErrors((prev) => ({
      ...prev,
      password: validatePassword(val),
      confirmPassword: confirmPassword ? validateConfirmPassword(confirmPassword, val) : prev.confirmPassword,
    }));
    clearError();
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfirmPassword(val);
    setFieldErrors((prev) => ({
      ...prev,
      confirmPassword: validateConfirmPassword(val, password),
    }));
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const passErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword, password);

    setFieldErrors({
      password: passErr,
      confirmPassword: confirmErr,
    });

    if (passErr || confirmErr) return;

    const result = await updatePassword(password);
    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
    }
  };

  if (checkingSession) {
    return (
      <Card className="animate-slide-up">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-electric-blue">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <CardTitle className="text-xl font-semibold text-navy-900">Verifying recovery link...</CardTitle>
          <CardDescription className="text-navy-500">
            Please wait while we authenticate your password reset session.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasValidSession) {
    return (
      <Card className="animate-slide-up">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle className="h-8 w-8" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-semibold text-navy-900">Reset link expired or invalid</CardTitle>
          <CardDescription className="text-navy-500 max-w-sm mx-auto">
            This password recovery link is either invalid, already used, or has expired. For your security, reset links are only valid for a limited time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => router.push("/auth/forgot-password")}
            className="w-full"
            size="lg"
          >
            Request a new reset link
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-3 pt-2">
          <Link
            href="/auth/login"
            className="text-sm text-navy-600 hover:text-navy-900 inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="animate-slide-up">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-semibold text-navy-900">Password reset complete</CardTitle>
          <CardDescription className="text-navy-500">
            Your password has been successfully updated. Redirecting to your dashboard...
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col items-center gap-3 pt-2">
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full"
            size="lg"
          >
            Go to Dashboard
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
        <CardTitle className="text-2xl font-semibold text-navy-900">Create new password</CardTitle>
        <CardDescription className="text-navy-500">
          Enter a strong new password for your Mocky account.
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
            label="New password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={handlePasswordChange}
            error={fieldErrors.password}
            placeholder="Enter new password"
            disabled={loading}
            aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
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

          <p id="password-hint" className="text-xs text-navy-500 ml-1">
            At least 8 characters with uppercase, lowercase, and number
          </p>

          <Input
            label="Confirm new password"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            error={fieldErrors.confirmPassword}
            placeholder="Confirm new password"
            disabled={loading}
            endIcon={
              <button
                type="button"
                className="text-navy-400 hover:text-navy-600 transition-colors focus:outline-none flex items-center justify-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col items-center gap-3 pt-2">
        <Link
          href="/auth/login"
          className="text-sm text-navy-500 hover:text-navy-900 transition-colors"
        >
          Cancel and return to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="animate-slide-up text-center text-navy-500">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
