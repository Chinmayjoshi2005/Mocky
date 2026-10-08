import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "./dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard - Mocky",
  description: "Your private AI interview room.",
};

export default async function DashboardPage() {
  let user = null;
  const cookieStore = await cookies();

  // Fast check: Only query Supabase if Supabase session cookies actually exist
  const hasSbCookie = cookieStore.getAll().some((c) => c.name.startsWith("sb-"));
  if (hasSbCookie) {
    try {
      const supabase = await createClient();
      const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 1500)
      );
      const {
        data: { user: authUser },
      } = await Promise.race([supabase.auth.getUser(), timeoutPromise]);
      user = authUser;
    } catch (err) {
      console.error("Dashboard auth check error:", err);
    }
  }

  if (!user) {
    redirect("/auth/login?redirect=/dashboard");
  }

  return <DashboardContent user={user} />;
}