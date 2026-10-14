import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

/**
 * Server state lives in TanStack Query (ADR-0004). Reads retry twice on network or
 * server errors, never on 4xx; mutations never retry silently (plan C13: money safety).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: { retry: false },
  },
});
