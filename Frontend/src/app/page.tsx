import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  let hasUser = false;
  const cookieStore = await cookies();

  // Instant check: if user has no Supabase cookies, redirect immediately in 0ms
  const hasSbCookie = cookieStore.getAll().some((c) => c.name.startsWith("sb-"));

  if (hasSbCookie) {
    try {
      const supabase = await createClient();
      const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 1500)
      );
      const {
        data: { user },
      } = await Promise.race([supabase.auth.getUser(), timeoutPromise]);
      hasUser = !!user;
    } catch (err) {
      console.error("HomePage auth check error:", err);
      hasUser = false;
    }
  }

  if (hasUser) {
    redirect("/dashboard");
  } else {
    redirect("/auth/login");
  }
}