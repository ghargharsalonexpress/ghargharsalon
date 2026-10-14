import { type Role, ROLE_HOME, type UserDto } from "@brand/shared";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { type LoaderFunctionArgs, redirect } from "react-router";
import { loadSession } from "@/lib/api";
import { queryClient } from "./queryClient";

/**
 * GET /v1/session: who is signed in (or null) plus the CSRF token.
 * The AbortSignal is deliberately not used: route loaders await this query, and React Query
 * cancels a signal-consuming fetch when its last observer unmounts (as StrictMode does once).
 */
export const sessionQuery = queryOptions({
  queryKey: ["session"] as const,
  queryFn: loadSession,
  staleTime: 5 * 60_000,
});

export const useSession = () => useQuery(sessionQuery);

export function useCurrentUser(): UserDto | null {
  return useQuery(sessionQuery).data?.user ?? null;
}

/** Reads the cached session without fetching it, for app-wide listeners on pages that don't need the API. */
export function useCachedUser(): UserDto | null {
  return useQuery({ ...sessionQuery, enabled: false }).data?.user ?? null;
}

export function setSessionUser(user: UserDto | null): void {
  queryClient.setQueryData(sessionQuery.queryKey, (previous) => (previous ? { ...previous, user } : previous));
}

export const homeFor = (user: Pick<UserDto, "role">): string => ROLE_HOME[user.role];

/** Only same-site paths are followed after login, never "//evil.example" or full URLs (open redirect). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

const loginRedirect = (url: URL) => redirect(`/login?next=${encodeURIComponent(url.pathname + url.search)}`);

/** Route loader: a signed-in user with one of the roles, otherwise login or their own home. */
export function requireRole(...roles: Role[]) {
  return async ({ request }: LoaderFunctionArgs) => {
    const { user } = await queryClient.ensureQueryData(sessionQuery);
    if (!user) throw loginRedirect(new URL(request.url));
    if (!roles.includes(user.role)) throw redirect(homeFor(user));
    return null;
  };
}

/** Route loader for login and sign-up: signed-in people go where they were heading, or home. */
export async function guestOnly({ request }: LoaderFunctionArgs) {
  const { user } = await queryClient.ensureQueryData(sessionQuery);
  if (user) throw redirect(safeNext(new URL(request.url).searchParams.get("next")) ?? homeFor(user));
  return null;
}
