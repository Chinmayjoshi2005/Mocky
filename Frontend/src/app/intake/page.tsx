import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IntakeContent } from "./intake-content";

export const metadata: Metadata = {
  title: "Interview Intake - Mocky",
  description:
    "Upload your resume and target job description to set up your tailored mock interview context.",
};

export default async function IntakePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
