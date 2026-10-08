import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { IntakeContent } from "./intake-content";

export const metadata: Metadata = {
  title: "Interview Intake - Mocky",
  description:
    "Upload your resume and target job description to set up your tailored mock interview context.",
};

export default async function IntakePage() {
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
      console.error("Intake auth check error:", err);
    }
  }

  if (!user) {
    redirect("/auth/login?redirect=/intake");
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-200 border-t-electric-blue" />
        </div>
      }
    >
      <IntakeContent user={user} />
    </Suspense>
  );
}
