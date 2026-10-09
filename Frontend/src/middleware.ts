import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-project-ref")) {
    // If Supabase is not configured, allow request to proceed
    return supabaseResponse;
  }

  try {
    let activeUser = null;

    // Only attempt Supabase validation if Supabase auth cookies actually exist in request
    const hasSupabaseCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

    if (hasSupabaseCookie) {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              supabaseResponse = NextResponse.next({
                request,
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              );
            },
          },
        }
      );

      try {
        // Strict 1500ms timeout prevents hanging when Supabase project is unreachable or paused
        const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { user: null } }), 1500)
        );
        const {
          data: { user },
        } = await Promise.race([supabase.auth.getUser(), timeoutPromise]);
        activeUser = user;
      } catch {
        activeUser = null;
      }
    }

    const pathname = request.nextUrl.pathname;
    const isProtected =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/intake") ||
      pathname.startsWith("/interview") ||
      pathname.startsWith("/progress");

    // Guest-only auth pages (redirect logged-in users away)
    const isGuestOnlyAuthPage =
      pathname === "/auth/login" ||
      pathname === "/auth/signup" ||
      pathname === "/auth/forgot-password" ||
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/register" ||
      pathname === "/auth/register";

    if (!activeUser && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (activeUser && isGuestOnlyAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (!activeUser) {
      if (pathname === "/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        return NextResponse.redirect(url);
      }
      if (pathname === "/signup" || pathname === "/register" || pathname === "/auth/register") {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/signup";
        return NextResponse.redirect(url);
      }
    }
  } catch (err) {
    console.error("Middleware auth error:", err);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};