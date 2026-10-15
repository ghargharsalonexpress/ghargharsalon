import type { AdminPageDto, AreaRequestDto, CreatePageInput, PageSummaryDto, PageVersionDto, SavePageInput, SiteConfig, SiteConfigResponse, SiteVersionDto } from "@brand/shared";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Admin → Website (ADR-0021): the site configuration, pages and area requests.

export const adminSiteQuery = queryOptions({
  queryKey: ["admin", "site"] as const,
  queryFn: () => api.get<SiteConfigResponse>("/v1/admin/site"),
  // An editor must never be silently refreshed under the person typing.
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});

export const siteVersionsQuery = queryOptions({
  queryKey: ["admin", "site", "versions"] as const,
  queryFn: () => api.get<SiteVersionDto[]>("/v1/admin/site/versions"),
});

export const adminPagesQuery = queryOptions({
  queryKey: ["admin", "pages"] as const,
  queryFn: () => api.get<PageSummaryDto[]>("/v1/admin/site/pages"),
});

export const adminPageQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "page", id] as const,
    queryFn: () => api.get<AdminPageDto>(`/v1/admin/site/pages/${encodeURIComponent(id)}`),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const pageVersionsQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "page", id, "versions"] as const,
    queryFn: () => api.get<PageVersionDto[]>(`/v1/admin/site/pages/${encodeURIComponent(id)}/versions`),
  });

export const areaRequestsQuery = queryOptions({
  queryKey: ["admin", "area-requests"] as const,
  queryFn: () => api.get<AreaRequestDto[]>("/v1/admin/site/area-requests"),
});

/** Every website change also refreshes what visitors are shown in this browser. */
function useWebsiteInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "pages"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "site", "versions"] }),
      queryClient.invalidateQueries({ queryKey: ["site"] }),
      queryClient.invalidateQueries({ queryKey: ["page"] }),
    ]);
  };
}

export function useSaveSite() {
  const queryClient = useQueryClient();
  const invalidate = useWebsiteInvalidation();
  return useMutation({
    mutationFn: ({ version, site }: { version: number; site: SiteConfig }) => api.put<SiteConfigResponse>("/v1/admin/site", { version, site }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(adminSiteQuery.queryKey, saved);
      await invalidate();
    },
  });
}

export function useRestoreSite() {
  const queryClient = useQueryClient();
  const invalidate = useWebsiteInvalidation();
  return useMutation({
    mutationFn: ({ restore, version }: { restore: number; version: number }) => api.post<SiteConfigResponse>(`/v1/admin/site/versions/${restore}/restore`, { version }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(adminSiteQuery.queryKey, saved);
      await invalidate();
    },
  });
}

/** Keeps the editor's copy in step with what the server answered. */
function usePageMutation<T>(mutationFn: (input: T) => Promise<AdminPageDto>) {
  const queryClient = useQueryClient();
  const invalidate = useWebsiteInvalidation();
  return useMutation({
    mutationFn,
    onSuccess: async (page) => {
      queryClient.setQueryData(adminPageQuery(page.id).queryKey, page);
      await Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ["admin", "page", page.id, "versions"] })]);
    },
  });
}

export const useCreatePage = () => usePageMutation((input: CreatePageInput) => api.post<AdminPageDto>("/v1/admin/site/pages", input));
export const useSavePage = () => usePageMutation(({ id, input }: { id: string; input: SavePageInput }) => api.put<AdminPageDto>(`/v1/admin/site/pages/${encodeURIComponent(id)}`, input));
export const usePublishPage = () => usePageMutation(({ id, version }: { id: string; version: number }) => api.post<AdminPageDto>(`/v1/admin/site/pages/${encodeURIComponent(id)}/publish`, { version }));
export const useResetPage = () => usePageMutation(({ id, version }: { id: string; version: number }) => api.post<AdminPageDto>(`/v1/admin/site/pages/${encodeURIComponent(id)}/reset`, { version }));
export const useRestorePageVersion = () => usePageMutation(({ id, number }: { id: string; number: number }) => api.post<AdminPageDto>(`/v1/admin/site/pages/${encodeURIComponent(id)}/versions/${number}/restore`));

export function useDeletePage() {
  const invalidate = useWebsiteInvalidation();
  return useMutation({ mutationFn: (id: string) => api.delete<void>(`/v1/admin/site/pages/${encodeURIComponent(id)}`), onSuccess: invalidate });
}

export function useDeleteAreaRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/admin/site/area-requests/${encodeURIComponent(id)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: areaRequestsQuery.queryKey }),
  });
}
