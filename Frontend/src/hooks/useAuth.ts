"use client";

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateSecureInput } from "@/lib/security";
import type { AuthFormData, AuthResult, AuthState } from "@/types/auth";

function formatAuthError(err: unknown, defaultMessage: string): string {
  if (!err) return defaultMessage;
  const msg =
    typeof err === "string"
      ? err
      : err instanceof Error
      ? err.message
      : typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message
      : defaultMessage;

  const lower = msg.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("authretryablefetcherror") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused")
  ) {
    return "Cannot connect to authentication service. Your Supabase project is paused or unreachable. Please visit your Supabase dashboard to unpause/resume your project.";
  }

  return msg;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loading: false,
    error: null,
  });

  const supabase = useMemo(() => createClient(), []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const getOrigin = () => {
    if (typeof window !== "undefined" && window.location.origin) {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
  };

  const signUp = useCallback(
    async (data: AuthFormData): Promise<AuthResult> => {
      setState({ loading: true, error: null });

      // 1. Security Check: Block SQL Injection and Auth Bypass codes
      const emailCheck = validateSecureInput("email", data.email);
      if (!emailCheck.isValid) {
        setState({ loading: false, error: { message: emailCheck.error!, field: "email" } });
        return { success: false, error: emailCheck.error };
      }

      const passCheck = validateSecureInput("password", data.password);
      if (!passCheck.isValid) {
        setState({ loading: false, error: { message: passCheck.error!, field: "password" } });
        return { success: false, error: passCheck.error };
      }

      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email.trim(),
          password: data.password,
          options: {
            emailRedirectTo: `${getOrigin()}/auth/callback`,
          },
        });

        if (error) {
          const formattedMsg = formatAuthError(error, error.message);
          setState({
            loading: false,
            error: { message: formattedMsg, field: "form" },
          });
          return { success: false, error: formattedMsg };
        }

        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
          const existingMsg = "An account with this email already exists. Please sign in instead.";
          setState({
            loading: false,
            error: { message: existingMsg, field: "email" },
          });
          return { success: false, error: existingMsg };
        }

        setState({ loading: false, error: null });
        const requiresEmailConfirmation = !authData.session && !!authData.user;
        return { success: true, requiresEmailConfirmation };
      } catch (err: unknown) {
        const formattedMsg = formatAuthError(err, "Sign up failed. Please try again.");
        setState({
          loading: false,
          error: { message: formattedMsg, field: "form" },
        });
        return { success: false, error: formattedMsg };
      }
    },
    [supabase]
  );

  const signIn = useCallback(
    async (data: AuthFormData): Promise<AuthResult> => {
      setState({ loading: true, error: null });

      // 1. Security Check: Block SQL Injection and Auth Bypass codes
      const emailCheck = validateSecureInput("email", data.email);
      if (!emailCheck.isValid) {
        setState({ loading: false, error: { message: emailCheck.error!, field: "email" } });
        return { success: false, error: emailCheck.error };
      }

      const passCheck = validateSecureInput("password", data.password);
      if (!passCheck.isValid) {
        setState({ loading: false, error: { message: passCheck.error!, field: "password" } });
        return { success: false, error: passCheck.error };
      }

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email.trim(),
          password: data.password,
        });

        if (error) {
          const formattedMsg = formatAuthError(error, error.message);
          setState({
            loading: false,
            error: { message: formattedMsg, field: "form" },
          });
          return { success: false, error: formattedMsg };
        }

        setState({ loading: false, error: null });
        return { success: true };
      } catch (err: unknown) {
        const formattedMsg = formatAuthError(err, "Sign in failed. Please try again.");
        setState({
          loading: false,
          error: { message: formattedMsg, field: "form" },
        });
        return { success: false, error: formattedMsg };
      }
    },
    [supabase]
  );

  const signOut = useCallback(async (): Promise<AuthResult> => {
    setState({ loading: true, error: null });

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        const formattedMsg = formatAuthError(error, error.message);
        setState({
          loading: false,
          error: { message: formattedMsg, field: "form" },
        });
        return { success: false, error: formattedMsg };
      }
    } catch (err: unknown) {
      const formattedMsg = formatAuthError(err, "Sign out failed");
      setState({
        loading: false,
        error: { message: formattedMsg, field: "form" },
      });
      return { success: false, error: formattedMsg };
    }

    setState({ loading: false, error: null });
    return { success: true };
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      setState({ loading: true, error: null });

      const emailCheck = validateSecureInput("email", email);
      if (!emailCheck.isValid) {
        setState({ loading: false, error: { message: emailCheck.error!, field: "email" } });
        return { success: false, error: emailCheck.error };
      }

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${getOrigin()}/auth/reset-password`,
        });

        if (error) {
          const formattedMsg = formatAuthError(error, error.message);
          setState({
            loading: false,
            error: { message: formattedMsg, field: "email" },
          });
          return { success: false, error: formattedMsg };
        }

        setState({ loading: false, error: null });
        return { success: true };
      } catch (err: unknown) {
        const formattedMsg = formatAuthError(
          err,
          "Password reset request failed. Please try again."
        );
        setState({
          loading: false,
          error: { message: formattedMsg, field: "email" },
        });
        return { success: false, error: formattedMsg };
      }
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (password: string): Promise<AuthResult> => {
      setState({ loading: true, error: null });

      const passCheck = validateSecureInput("password", password);
      if (!passCheck.isValid) {
        setState({ loading: false, error: { message: passCheck.error!, field: "password" } });
        return { success: false, error: passCheck.error };
      }

      try {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          const formattedMsg = formatAuthError(error, error.message);
          setState({
            loading: false,
            error: { message: formattedMsg, field: "password" },
          });
          return { success: false, error: formattedMsg };
        }

        setState({ loading: false, error: null });
        return { success: true };
      } catch (err: unknown) {
        const formattedMsg = formatAuthError(
          err,
          "Password update failed. Please try again."
        );
        setState({
          loading: false,
          error: { message: formattedMsg, field: "password" },
        });
        return { success: false, error: formattedMsg };
      }
    },
    [supabase]
  );

  const updateEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      setState({ loading: true, error: null });

      const emailCheck = validateSecureInput("email", email);
      if (!emailCheck.isValid) {
        setState({ loading: false, error: { message: emailCheck.error!, field: "email" } });
        return { success: false, error: emailCheck.error };
      }

      try {
        const { error } = await supabase.auth.updateUser(
          { email: email.trim() },
          { emailRedirectTo: `${getOrigin()}/auth/callback` }
        );

        if (error) {
          const formattedMsg = formatAuthError(error, error.message);
          setState({
            loading: false,
            error: { message: formattedMsg, field: "email" },
          });
          return { success: false, error: formattedMsg };
        }

        setState({ loading: false, error: null });
        return { success: true };
      } catch (err: unknown) {
        const formattedMsg = formatAuthError(err, "Email update failed. Please try again.");
        setState({
          loading: false,
          error: { message: formattedMsg, field: "email" },
        });
        return { success: false, error: formattedMsg };
      }
    },
    [supabase]
  );

  const resendVerificationEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      setState({ loading: true, error: null });

      try {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: email.trim(),
          options: {
            emailRedirectTo: `${getOrigin()}/auth/callback`,
          },
        });

        if (error) {
          const formattedMsg = formatAuthError(error, error.message);
          setState({
            loading: false,
            error: { message: formattedMsg, field: "email" },
          });
          return { success: false, error: formattedMsg };
        }

        setState({ loading: false, error: null });
        return { success: true };
      } catch (err: unknown) {
        const formattedMsg = formatAuthError(err, "Failed to resend verification email.");
        setState({
          loading: false,
          error: { message: formattedMsg, field: "email" },
        });
        return { success: false, error: formattedMsg };
      }
    },
    [supabase]
  );

  return {
    ...state,
    clearError,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateEmail,
    resendVerificationEmail,
  };
}