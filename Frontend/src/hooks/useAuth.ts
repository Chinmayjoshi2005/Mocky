"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthFormData, AuthResult, AuthState } from "@/types/auth";

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loading: false,
    error: null,
  });

  const supabase = createClient();

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const signUp = useCallback(async (data: AuthFormData): Promise<AuthResult> => {
    setState({ loading: true, error: null });

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setState({
        loading: false,
        error: { message: error.message, field: "form" },
      });
      return { success: false, error: error.message };
    }

    setState({ loading: false, error: null });
    const requiresEmailConfirmation = !authData.session && !!authData.user;
    return { success: true, requiresEmailConfirmation };
  }, [supabase]);

  const signIn = useCallback(async (data: AuthFormData): Promise<AuthResult> => {
    setState({ loading: true, error: null });

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setState({
        loading: false,
        error: { message: error.message, field: "form" },
      });
      return { success: false, error: error.message };
    }

    setState({ loading: false, error: null });
    return { success: true };
  }, [supabase]);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    setState({ loading: true, error: null });

    const { error } = await supabase.auth.signOut();

    if (error) {
      setState({
        loading: false,
        error: { message: error.message, field: "form" },
      });
      return { success: false, error: error.message };
    }

    setState({ loading: false, error: null });
    return { success: true };
  }, [supabase]);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    setState({ loading: true, error: null });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setState({
        loading: false,
        error: { message: error.message, field: "email" },
      });
      return { success: false, error: error.message };
    }

    setState({ loading: false, error: null });
    return { success: true };
  }, [supabase]);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    setState({ loading: true, error: null });

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setState({
        loading: false,
        error: { message: error.message, field: "password" },
      });
      return { success: false, error: error.message };
    }

    setState({ loading: false, error: null });
    return { success: true };
  }, [supabase]);

  const updateEmail = useCallback(async (email: string): Promise<AuthResult> => {
    setState({ loading: true, error: null });

    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/auth/callback` }
    );

    if (error) {
      setState({
        loading: false,
        error: { message: error.message, field: "email" },
      });
      return { success: false, error: error.message };
    }

    setState({ loading: false, error: null });
    return { success: true };
  }, [supabase]);

  const resendVerificationEmail = useCallback(async (email: string): Promise<AuthResult> => {
    setState({ loading: true, error: null });

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setState({
        loading: false,
        error: { message: error.message, field: "email" },
      });
      return { success: false, error: error.message };
    }

    setState({ loading: false, error: null });
    return { success: true };
  }, [supabase]);

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