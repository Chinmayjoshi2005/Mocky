import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle explicit error from Supabase
  if (error || errorDescription) {
    const errorMsg = errorDescription || error || "Authentication failed";
    const dest = next.includes("reset-password")
      ? `/auth/forgot-password?error=${encodeURIComponent(errorMsg)}`
      : `/auth/login?error=${encodeURIComponent(errorMsg)}`;
    return NextResponse.redirect(`${origin}${dest}`);
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const forwardUrl = `${origin}${safeNext}`;

  if (code) {
    const response = NextResponse.redirect(forwardUrl);

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              );
            },
          },
        }
      );

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (!exchangeError) {
        return response;
      }

      console.error("Auth callback code exchange error:", exchangeError.message);
      const isPaused = exchangeError.message?.toLowerCase().includes("failed to fetch");
      const errText = isPaused
        ? "Auth service unreachable (project paused). Please resume in Supabase dashboard."
        : "Reset link has expired or is invalid. Please request a new one.";
      const dest = next.includes("reset-password")
        ? `/auth/forgot-password?error=${encodeURIComponent(errText)}`
        : `/auth/login?error=${encodeURIComponent(isPaused ? errText : exchangeError.message)}`;
      return NextResponse.redirect(`${origin}${dest}`);
    } catch (err: unknown) {
      console.error("Auth callback code exchange uncaught:", err);
      const dest = next.includes("reset-password")
        ? `/auth/forgot-password?error=${encodeURIComponent("Authentication service unreachable. Your Supabase project is paused or offline.")}`
        : `/auth/login?error=${encodeURIComponent("Authentication service unreachable. Your Supabase project is paused or offline.")}`;
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  if (token_hash && type) {
    const response = NextResponse.redirect(forwardUrl);

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              );
            },
          },
        }
      );

      const { error: verifyError } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!verifyError) {
        return response;
      }

      console.error("Auth callback OTP verification error:", verifyError.message);
      const isPaused = verifyError.message?.toLowerCase().includes("failed to fetch");
      const errText = isPaused
        ? "Auth service unreachable (project paused). Please resume in Supabase dashboard."
        : "Verification link has expired or is invalid. Please request a new one.";
      const dest = next.includes("reset-password")
        ? `/auth/forgot-password?error=${encodeURIComponent(errText)}`
        : `/auth/login?error=${encodeURIComponent(isPaused ? errText : verifyError.message)}`;
      return NextResponse.redirect(`${origin}${dest}`);
    } catch (err: unknown) {
      console.error("Auth callback OTP verification uncaught:", err);
      const dest = next.includes("reset-password")
        ? `/auth/forgot-password?error=${encodeURIComponent("Authentication service unreachable. Your Supabase project is paused or offline.")}`
        : `/auth/login?error=${encodeURIComponent("Authentication service unreachable. Your Supabase project is paused or offline.")}`;
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  // If no code or token_hash was provided (e.g. hash fragments were used or direct access)
  if (next.includes("reset-password")) {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Invalid+or+expired+link`);
}