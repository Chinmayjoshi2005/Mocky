import { createClient } from "@/lib/supabase/client";

/**
 * Centralised backend (FastAPI) API helper.
 *
 * All client components should call `apiFetch` instead of rolling their own
 * `fetch` + `getSession` + `Bearer` header logic. This guarantees:
 *  - A single, canonical backend URL (NEXT_PUBLIC_BACKEND_URL).
 *  - A consistent Authorization header sourced from the Supabase session.
 *  - Consistent error handling for non-OK responses.
 */

const supabase = createClient();

/** Resolve the configured backend URL, falling back to localhost dev server. */
export function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
}

/**
 * Fetch wrapper that attaches the current Supabase access token as a Bearer
 * header and throws on non-OK responses (parsed JSON error detail when present).
 *
 * When no session is available it throws an Error whose message contains
 * "session has expired" so callers can redirect to the login page.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || "Something went wrong. Please try again.");
  }

  // Allow callers to handle empty bodies (e.g. DELETE with no content).
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}