import { Metadata } from "next";
import "./globals.css";
import { DotGridShell } from "@/components/ui/dot-grid-shell";

export const metadata: Metadata = {
  title: "Mocky - Practice. Improve. Get hired.",
  description:
    "Your private AI interview room. Personalized mock technical interviews from your resume and job description.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body className="min-h-screen bg-navy-50 text-navy-900 font-sans" suppressHydrationWarning>
        <DotGridShell>{children}</DotGridShell>
      </body>
    </html>
  );
}