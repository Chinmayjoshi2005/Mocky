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
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const verified = searchParams.get("verified") === "true";
  const { signIn, loading, error, clearError } = useAuth();

  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<AuthFormData>>({});

  const validateField = (name: string, value: string) => {
    let error = "";
    switch (name) {
      case "email":
        if (!value) error = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Enter a valid email address";
        break;
      case "password":
        if (!value) error = "Password is required";
        break;
    }
    return error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
    if (error?.includes("form")) clearError();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    let hasErrors = false;
    const newFieldErrors: Partial<AuthFormData> = {};

    (Object.keys(formData) as Array<keyof AuthFormData>).forEach((key) => {
      const error = validateField(key, formData[key] as string);
      if (error) {
        newFieldErrors[key] = error;
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
              href="/auth/forgot-password"
              className="text-sm text-electric-blue hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {loading ? <Loader2 className="h-4 w-4" /> : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-3 pt-4">
        <p className="text-sm text-navy-500">
          Don&apos;t have an account?{" "}
          <Link href={`/auth/signup?redirect=${encodeURIComponent(redirectTo ?? "/dashboard")}`} className="text-electric-blue hover:underline font-medium">
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