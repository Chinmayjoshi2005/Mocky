import { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-navy-200/80 bg-white/80 shadow-[0_4px_18px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center" aria-label="Mocky home">
            <Logo size="md" withText />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md animate-slide-up">{children}</div>
      </main>
      <footer className="border-t border-navy-200/80 bg-white/60 py-5 shadow-[0_-4px_18px_rgba(15,23,42,0.04)] backdrop-blur-md">
        <p className="mx-auto max-w-7xl text-center text-sm text-navy-500 px-4">
          &copy; {new Date().getFullYear()} Mocky. Your private AI interview room.
        </p>
      </footer>
    </div>
  );
}