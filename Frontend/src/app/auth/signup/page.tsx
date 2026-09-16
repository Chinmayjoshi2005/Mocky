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

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirect");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : "/dashboard";
  const { signUp, loading, error, clearError } = useAuth();

  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        else if (value.length < 8) error = "Password must be at least 8 characters";
        else if (!/[A-Z]/.test(value)) error = "Password must contain at least one uppercase letter";
        else if (!/[a-z]/.test(value)) error = "Password must contain at least one lowercase letter";
        else if (!/[0-9]/.test(value)) error = "Password must contain at least one number";
        break;
      case "confirmPassword":
        if (!value) error = "Please confirm your password";
        else if (value !== formData.password) error = "Passwords do not match";
        break;
    }
    return error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
    clearError();
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

    const result = await signUp({ email: formData.email, password: formData.password });

    if (result.success) {
      if (result.requiresEmailConfirmation) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}&redirect=${encodeURIComponent(redirectTo ?? "/dashboard")}`);
      } else {
        router.push(redirectTo ?? "/dashboard");
      }
    }
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4">
          <Logo size="lg" withText />
        </div>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Practice. Improve. Get hired. Your private AI interview room.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {(error || fieldErrors.email) && (
            <div
              className="animate-fade-in p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"
              role="alert"
              aria-live="polite"
            >
              {error?.message || fieldErrors.email}
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
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />

          <Input
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={fieldErrors.password}
            placeholder="Create a strong password"
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
            label="Confirm password"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            error={fieldErrors.confirmPassword}
            placeholder="Confirm your password"
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
            {loading ? <Loader2 className="h-4 w-4" /> : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-3 pt-4">
        <p className="text-sm text-navy-500">
          Already have an account?{" "}
          <Link href={`/auth/login?redirect=${encodeURIComponent(redirectTo ?? "/dashboard")}`} className="text-electric-blue hover:underline font-medium">
            Sign in
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

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="animate-slide-up">Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}