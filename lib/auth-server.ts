/**
 * Server-side auth helpers used by Next.js API routes.
 * Reads auth_token cookie, adds Authorization header to backend requests.
 */
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const COOKIE_NAME = "auth_token";
export const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year — совпадает с JWT TTL, без частого релогина

/** Read JWT from the httpOnly cookie (server-side only). */
export async function getAuthToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

/** Build headers for backend requests that require auth. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Proxy a request to the backend, attaching auth header. */
export async function backendFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${BACKEND}${path}`, { ...init, headers });
}

/** Cookie options for Set-Cookie (httpOnly, Secure in prod). */
export function cookieOptions(maxAge = COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
