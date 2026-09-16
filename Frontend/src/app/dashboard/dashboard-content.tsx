"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Moon,
  Sun,
  User,
  Mail,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Clock,
  FileText,
  Briefcase,
  PlayCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { useAuth, useUser } from "@/hooks";

interface DashboardContentProps {
  user: {
    email?: string;
    created_at: string;
    user_metadata?: { full_name?: string };
  };
}

export function DashboardContent({ user }: DashboardContentProps) {
  const router = useRouter();
  const { signOut, updatePassword, updateEmail, loading } = useAuth();
  const { user: liveUser } = useUser();
  const activeUser = liveUser || user;
  const isDarkMode = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("mocky-theme-change", onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("mocky-theme-change", onStoreChange);
      };
    },
    () => window.localStorage.getItem("mocky-theme") === "dark",
    () => false
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    const nextIsDark = !isDarkMode;
    window.localStorage.setItem("mocky-theme", nextIsDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", nextIsDark);
    window.dispatchEvent(new Event("mocky-theme-change"));
  };

  // Password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordApiError, setPasswordApiError] = useState<string | null>(null);

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailApiError, setEmailApiError] = useState<string | null>(null);

  const closePasswordModal = useCallback(() => {
    setIsPasswordModalOpen(false);
    setPasswordData({ newPassword: "", confirmPassword: "" });
    setPasswordErrors({});
    setPasswordApiError(null);
    setPasswordSuccess(false);
  }, []);

  const closeEmailModal = useCallback(() => {
    setIsEmailModalOpen(false);
    setNewEmail("");
    setEmailError("");
    setEmailApiError(null);
    setEmailSuccess(false);
  }, []);

  // Close modals on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPasswordModalOpen) closePasswordModal();
        if (isEmailModalOpen) closeEmailModal();
      }
    },
    [isPasswordModalOpen, isEmailModalOpen, closePasswordModal, closeEmailModal]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      router.push("/auth/login");
      router.refresh();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const userEmail = activeUser.email || "No email";
  const displayName = activeUser.user_metadata?.full_name || userEmail.split("@")[0] || "User";
  const initial = displayName[0]?.toUpperCase() || "U";

  // --- Password Handlers ---
  const validatePasswordField = (name: string, value: string, currentPasswordData = passwordData) => {
    let error = "";
    if (name === "newPassword") {
      if (!value) error = "Password is required";
      else if (value.length < 8) error = "Password must be at least 8 characters";
      else if (!/[A-Z]/.test(value)) error = "Password must contain at least one uppercase letter";
      else if (!/[a-z]/.test(value)) error = "Password must contain at least one lowercase letter";
      else if (!/[0-9]/.test(value)) error = "Password must contain at least one number";
    } else if (name === "confirmPassword") {
      if (!value) error = "Please confirm your password";
      else if (value !== currentPasswordData.newPassword) error = "Passwords do not match";
    }
    return error;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updated = { ...passwordData, [name]: value };
    setPasswordData(updated);
    const error = validatePasswordField(name, value, updated);
    setPasswordErrors((prev) => ({ ...prev, [name]: error }));
    if (passwordApiError) setPasswordApiError(null);
  };

  const handlePasswordBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const error = validatePasswordField(name, value);
    setPasswordErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordApiError(null);

    const errNew = validatePasswordField("newPassword", passwordData.newPassword);
    const errConfirm = validatePasswordField("confirmPassword", passwordData.confirmPassword);

    if (errNew || errConfirm) {
      setPasswordErrors({ newPassword: errNew, confirmPassword: errConfirm });
      return;
    }

    setPasswordSubmitting(true);
    const result = await updatePassword(passwordData.newPassword);
    setPasswordSubmitting(false);

    if (!result.success) {
      setPasswordApiError(result.error || "Failed to update password. Please try again.");
    } else {
      setPasswordSuccess(true);
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setPasswordErrors({});
    }
  };

  // --- Email Handlers ---
  const validateEmailField = (value: string) => {
    let error = "";
    if (!value) error = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Enter a valid email address";
    else if (value.trim().toLowerCase() === userEmail.toLowerCase()) {
      error = "New email must be different from current email";
    }
    return error;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewEmail(value);
    const error = validateEmailField(value);
    setEmailError(error);
    if (emailApiError) setEmailApiError(null);
  };

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setEmailError(validateEmailField(e.target.value));
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailApiError(null);

    const err = validateEmailField(newEmail);
    if (err) {
      setEmailError(err);
      return;
    }

    setEmailSubmitting(true);
    const result = await updateEmail(newEmail.trim());
    setEmailSubmitting(false);

    if (!result.success) {
      setEmailApiError(result.error || "Failed to update email. Please try again.");
    } else {
      setEmailSuccess(true);
    }
  };

  return (
    <div className="portrait-frame py-6 sm:py-8 animate-slide-up">
      <div className="clay-header mb-8 flex flex-col gap-5 rounded-[26px] border border-white/80 bg-blue-100/70 p-5 shadow-[12px_12px_28px_rgba(136,148,174,0.34),-10px_-10px_24px_rgba(255,255,255,0.9)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <Logo size="lg" withText />
          <p className="mt-1 text-sm font-bold text-navy-700">Your private AI interview room</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            title={isDarkMode ? "Switch to bright mode" : "Switch to dark mode"}
            aria-label={isDarkMode ? "Switch to bright mode" : "Switch to dark mode"}
            aria-pressed={isDarkMode}
          >
            {isDarkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSignOut}
            loading={loading}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Account Details Card */}
        <Card className="bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-electric-blue" aria-hidden="true" />
              Account
            </CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-navy-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-white font-medium">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-navy-900 truncate">{displayName}</p>
                <p className="text-sm text-navy-500 truncate">{userEmail}</p>
              </div>
            </div>
            <div className="border-t border-navy-200 pt-3">
              <p className="text-sm text-navy-500">
                Member since <span className="text-navy-900 font-medium">{formatDate(user.created_at)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security & Access Card */}
        <Card className="bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-electric-blue" aria-hidden="true" />
              Security
            </CardTitle>
            <CardDescription>Manage your password, email, and sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start hover:border-electric-blue hover:text-electric-blue"
              onClick={() => {
                closeEmailModal();
                closePasswordModal();
                setIsEmailModalOpen(true);
              }}
            >
              <Mail className="h-4 w-4 mr-2 text-navy-500" aria-hidden="true" />
              Update email
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start hover:border-electric-blue hover:text-electric-blue"
              onClick={() => {
                closePasswordModal();
                closeEmailModal();
                setIsPasswordModalOpen(true);
              }}
            >
              <Key className="h-4 w-4 mr-2 text-navy-500" aria-hidden="true" />
              Change password
            </Button>

            {/* Honest, transparent active sessions notice */}
            <div className="p-3 rounded-lg border border-navy-200 bg-navy-50/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-electric-blue" aria-hidden="true" />
                  <span className="text-sm font-medium text-navy-900">Active Sessions</span>
                </div>
                <span className="text-[11px] font-semibold text-navy-600 bg-blue-50 px-2 py-0.5 rounded">
                  Coming Soon
                </span>
              </div>
              <p className="mt-1.5 text-xs text-navy-500 leading-relaxed">
                Current device session is active. Multi-device tracking and remote session revocation will be available in an upcoming release.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mocky Feature Intake Card */}
        <Card className="bg-amber-50 md:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-electric-blue" aria-hidden="true" />
                Mocky Interview Platform
              </CardTitle>
              <CardDescription className="mt-1">
                Personalized mock technical interviews tailored from your resume and target job description.
              </CardDescription>
            </div>
            <Link href="/intake">
              <Button size="sm" className="hidden sm:inline-flex">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Start Intake
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                href="/intake?step=1"
                className="clay-tile clay-tile-blue group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[7px_7px_16px_rgba(136,148,174,0.3),-5px_-5px_12px_rgba(255,255,255,0.9)] transition-all hover:-translate-y-1 hover:border-white hover:bg-blue-100/70 hover:shadow-[10px_10px_20px_rgba(136,148,174,0.34),-7px_-7px_15px_rgba(255,255,255,0.95)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-electric-blue group-hover:scale-105 transition-transform">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-navy-500 bg-navy-100 px-2 py-0.5 rounded">
                      Step 1
                    </span>
                  </div>
                  <p className="font-medium text-navy-900 group-hover:text-electric-blue transition-colors">
                    Upload Resume
                  </p>
                  <p className="mt-1 text-xs text-navy-500 leading-relaxed">
                    Upload your PDF resume to anchor questions in your real experience.
                  </p>
                </div>
                <div className="mt-3 flex items-center text-xs font-semibold text-electric-blue group-hover:translate-x-0.5 transition-transform">
                  <span>Configure</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </Link>

              <Link
                href="/intake?step=2"
                className="clay-tile clay-tile-mint group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[7px_7px_16px_rgba(136,148,174,0.3),-5px_-5px_12px_rgba(255,255,255,0.9)] transition-all hover:-translate-y-1 hover:border-white hover:bg-emerald-100/70 hover:shadow-[10px_10px_20px_rgba(136,148,174,0.34),-7px_-7px_15px_rgba(255,255,255,0.95)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-electric-blue group-hover:scale-105 transition-transform">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-navy-500 bg-navy-100 px-2 py-0.5 rounded">
                      Step 2
                    </span>
                  </div>
                  <p className="font-medium text-navy-900 group-hover:text-electric-blue transition-colors">
                    Paste Job Description
                  </p>
                  <p className="mt-1 text-xs text-navy-500 leading-relaxed">
                    Set role requirements, seniority, and competencies.
                  </p>
                </div>
                <div className="mt-3 flex items-center text-xs font-semibold text-electric-blue group-hover:translate-x-0.5 transition-transform">
                  <span>Configure</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </Link>

              <Link
                href="/intake"
                className="clay-tile clay-tile-amber group flex cursor-pointer flex-col justify-between rounded-2xl border border-white/80 bg-amber-100/80 p-4 shadow-[7px_7px_16px_rgba(136,148,174,0.3),-5px_-5px_12px_rgba(255,255,255,0.9)] transition-all hover:-translate-y-1 hover:border-white hover:bg-amber-200/80 hover:shadow-[10px_10px_20px_rgba(136,148,174,0.34),-7px_-7px_15px_rgba(255,255,255,0.95)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-electric-blue text-white group-hover:scale-105 transition-transform">
                      <PlayCircle className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-electric-blue bg-white border border-blue-200 px-2 py-0.5 rounded">
                      Intake
                    </span>
                  </div>
                  <p className="font-semibold text-navy-900 group-hover:text-electric-blue transition-colors">
                    Start Interview Intake
                  </p>
                  <p className="mt-1 text-xs text-navy-500 leading-relaxed">
                    Set up your complete interview context in a few guided steps.
                  </p>
                </div>
                <div className="mt-3 flex items-center text-xs font-semibold text-electric-blue group-hover:translate-x-0.5 transition-transform">
                  <span>Open Intake</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </Link>
            </div>
            <div className="pt-4 border-t border-navy-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-navy-500">
              <p>
                Phase 2A intake foundation is active. AI question generation and live interview room follow in Phase 2B.
              </p>
              <Link href="/intake" className="sm:hidden">
                <Button size="sm" className="w-full">
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Start Intake
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-xs p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
        >
          <div className="relative w-full max-w-md rounded-lg border border-navy-200 bg-white p-6 shadow-lg animate-slide-up">
            <button
              onClick={closePasswordModal}
              className="absolute right-4 top-4 rounded-sm text-navy-400 hover:text-navy-700 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h2 id="change-password-title" className="text-xl font-bold text-navy-900">
                Change Password
              </h2>
              <p className="text-sm text-navy-500 mt-1">
                Enter your new password below. It must be at least 8 characters with uppercase, lowercase, and numbers.
              </p>
            </div>

            {passwordSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3 text-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Password updated successfully</p>
                    <p className="text-xs text-green-700 mt-1">
                      Your new password is now active. Use it the next time you sign in.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={closePasswordModal} size="sm">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
                {passwordApiError && (
                  <div
                    className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{passwordApiError}</span>
                  </div>
                )}

                <Input
                  label="New password"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  error={passwordErrors.newPassword}
                  placeholder="At least 8 characters"
                  disabled={passwordSubmitting}
                  endIcon={
                    <button
                      type="button"
                      className="text-navy-400 hover:text-navy-600 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                <Input
                  label="Confirm new password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  error={passwordErrors.confirmPassword}
                  placeholder="Re-enter your new password"
                  disabled={passwordSubmitting}
                  endIcon={
                    <button
                      type="button"
                      className="text-navy-400 hover:text-navy-600 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      aria-pressed={showConfirmPassword}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closePasswordModal}
                    disabled={passwordSubmitting}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={passwordSubmitting}
                    disabled={passwordSubmitting}
                    size="sm"
                  >
                    {passwordSubmitting ? "Updating..." : "Update password"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Email Update Modal */}
      {isEmailModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 backdrop-blur-xs p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-email-title"
        >
          <div className="relative w-full max-w-md rounded-lg border border-navy-200 bg-white p-6 shadow-lg animate-slide-up">
            <button
              onClick={closeEmailModal}
              className="absolute right-4 top-4 rounded-sm text-navy-400 hover:text-navy-700 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h2 id="update-email-title" className="text-xl font-bold text-navy-900">
                Update Email Address
              </h2>
              <p className="text-sm text-navy-500 mt-1">
                Enter your new email address. Verification links will be required before the update takes effect.
              </p>
            </div>

            {emailSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3 text-blue-900">
                  <Clock className="h-5 w-5 text-electric-blue mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Confirmation link dispatched</p>
                    <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                      A verification email has been sent to <strong>{newEmail}</strong>. Depending on Supabase security settings, you may also receive a confirmation email at your current address ({userEmail}).
                    </p>
                    <p className="text-xs text-blue-700 mt-2 font-medium">
                      Your email address will remain unchanged until both verification links are confirmed.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={closeEmailModal} size="sm">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
                {emailApiError && (
                  <div
                    className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{emailApiError}</span>
                  </div>
                )}

                <div className="p-3 rounded-md bg-navy-50 border border-navy-200 text-xs text-navy-600">
                  Current email: <span className="font-semibold text-navy-900">{userEmail}</span>
                </div>

                <Input
                  label="New email address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  error={emailError}
                  placeholder="new-email@example.com"
                  disabled={emailSubmitting}
                />

                <p className="text-xs text-navy-400">
                  Note: A confirmation link will be sent to the new address before your account email is updated.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEmailModal}
                    disabled={emailSubmitting}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={emailSubmitting}
                    disabled={emailSubmitting}
                    size="sm"
                  >
                    {emailSubmitting ? "Sending..." : "Send confirmation"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}