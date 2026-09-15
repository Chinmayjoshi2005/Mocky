export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface AuthError {
  message: string;
  field?: string;
}

export interface AuthState {
  loading: boolean;
  error: AuthError | null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

export type AuthMode = "signup" | "login" | "forgot-password" | "reset-password" | "verify-email";